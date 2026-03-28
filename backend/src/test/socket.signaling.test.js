import { registerChatHandlers } from "../socket/chatHandlers.js";

class MockSocket {
  constructor(id, userId) {
    this.id = id;
    this.data = { userId };
    this.handlers = new Map();
  }

  on(eventName, handler) {
    this.handlers.set(eventName, handler);
  }

  trigger(eventName, payload) {
    const handler = this.handlers.get(eventName);
    if (!handler) {
      throw new Error(`No handler registered for event: ${eventName}`);
    }

    return handler(payload);
  }

  join() {}

  leave() {}
}

function createMockIo() {
  const emissions = new Map();

  const pushEvent = (targetId, eventName, payload) => {
    if (!emissions.has(targetId)) {
      emissions.set(targetId, []);
    }

    emissions.get(targetId).push({ eventName, payload });
  };

  return {
    to(targetId) {
      return {
        emit(eventName, payload) {
          pushEvent(targetId, eventName, payload);
        },
      };
    },
    getEvents(targetId, eventName) {
      const all = emissions.get(targetId) || [];
      return all.filter((event) => event.eventName === eventName);
    },
    getAllEvents(targetId) {
      return emissions.get(targetId) || [];
    },
  };
}

function setupUser(io, socketId, userId) {
  const socket = new MockSocket(socketId, userId);
  registerChatHandlers(io, socket);
  return socket;
}

describe("Socket signaling integration", () => {
  it("emits incoming-call to all callee sockets after call-user", async () => {
    const io = createMockIo();
    const caller = setupUser(io, "caller-socket-1", "caller-user-1");
    setupUser(io, "callee-socket-1", "callee-user-1");
    setupUser(io, "callee-socket-2", "callee-user-1");

    await caller.trigger("call-user", { targetUserId: "callee-user-1" });

    const incomingOnFirst = io.getEvents("callee-socket-1", "incoming-call");
    const incomingOnSecond = io.getEvents("callee-socket-2", "incoming-call");

    expect(incomingOnFirst).toHaveLength(1);
    expect(incomingOnSecond).toHaveLength(1);

    expect(incomingOnFirst[0].payload.callerUserId).toBe("caller-user-1");
    expect(incomingOnSecond[0].payload.callerUserId).toBe("caller-user-1");
    expect(incomingOnFirst[0].payload.callId).toEqual(incomingOnSecond[0].payload.callId);
  });

  it("enforces first-accept-wins when callee has multiple sockets", async () => {
    const io = createMockIo();
    const caller = setupUser(io, "caller-socket-2", "caller-user-2");
    const calleeTabA = setupUser(io, "callee-socket-3", "callee-user-2");
    const calleeTabB = setupUser(io, "callee-socket-4", "callee-user-2");

    await caller.trigger("call-user", { targetUserId: "callee-user-2" });

    const incoming = io.getEvents("callee-socket-3", "incoming-call")[0];
    const callId = incoming.payload.callId;

    await calleeTabA.trigger("call-accepted", { callId });
    await calleeTabB.trigger("call-accepted", { callId });

    const acceptedOnCaller = io.getEvents("caller-socket-2", "call-accepted");
    const failedOnSecondTab = io.getEvents("callee-socket-4", "call-failed");

    expect(acceptedOnCaller).toHaveLength(1);
    expect(acceptedOnCaller[0].payload.callId).toBe(callId);

    expect(failedOnSecondTab).toHaveLength(1);
    expect(failedOnSecondTab[0].payload.reason).toBe("already-accepted");
  });

  it("routes offer, answer and ice only between caller and accepted callee socket", async () => {
    const io = createMockIo();
    const caller = setupUser(io, "caller-socket-5", "caller-user-3");
    const callee = setupUser(io, "callee-socket-5", "callee-user-3");

    await caller.trigger("call-user", { targetUserId: "callee-user-3" });
    const incoming = io.getEvents("callee-socket-5", "incoming-call")[0];
    const callId = incoming.payload.callId;

    await callee.trigger("call-accepted", { callId });

    const offer = { type: "offer", sdp: "offer-sdp" };
    await caller.trigger("webrtc-offer", { callId, offer });

    const answer = { type: "answer", sdp: "answer-sdp" };
    await callee.trigger("webrtc-answer", { callId, answer });

    const iceCandidate = { candidate: "ice-1", sdpMid: "0", sdpMLineIndex: 0 };
    await caller.trigger("webrtc-ice-candidate", { callId, candidate: iceCandidate });

    const offerOnCallee = io.getEvents("callee-socket-5", "webrtc-offer");
    const answerOnCaller = io.getEvents("caller-socket-5", "webrtc-answer");
    const iceOnCallee = io.getEvents("callee-socket-5", "webrtc-ice-candidate");

    expect(offerOnCallee).toHaveLength(1);
    expect(offerOnCallee[0].payload.callId).toBe(callId);
    expect(offerOnCallee[0].payload.offer).toEqual(offer);

    expect(answerOnCaller).toHaveLength(1);
    expect(answerOnCaller[0].payload.callId).toBe(callId);
    expect(answerOnCaller[0].payload.answer).toEqual(answer);

    expect(iceOnCallee).toHaveLength(1);
    expect(iceOnCallee[0].payload.callId).toBe(callId);
    expect(iceOnCallee[0].payload.candidate).toEqual(iceCandidate);
  });

  it("emits call-failed when callee is offline", async () => {
    const io = createMockIo();
    const caller = setupUser(io, "caller-socket-6", "caller-user-4");

    await caller.trigger("call-user", { targetUserId: "offline-user-1" });

    const failedEvents = io.getEvents("caller-socket-6", "call-failed");
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].payload.reason).toBe("callee-offline");
    expect(failedEvents[0].payload.targetUserId).toBe("offline-user-1");
  });

  it("cleans up ringing session when caller disconnects and notifies all callee sockets", async () => {
    const io = createMockIo();
    const caller = setupUser(io, "caller-socket-7", "caller-user-5");
    const calleeTabA = setupUser(io, "callee-socket-7", "callee-user-5");
    const calleeTabB = setupUser(io, "callee-socket-8", "callee-user-5");

    await caller.trigger("call-user", { targetUserId: "callee-user-5" });

    const incomingA = io.getEvents("callee-socket-7", "incoming-call")[0];
    const incomingB = io.getEvents("callee-socket-8", "incoming-call")[0];
    expect(incomingA.payload.callId).toBe(incomingB.payload.callId);

    await caller.trigger("disconnect");

    const endedOnA = io.getEvents("callee-socket-7", "call-ended");
    const endedOnB = io.getEvents("callee-socket-8", "call-ended");

    expect(endedOnA).toHaveLength(1);
    expect(endedOnB).toHaveLength(1);
    expect(endedOnA[0].payload.callId).toBe(incomingA.payload.callId);
    expect(endedOnA[0].payload.reason).toBe("caller-disconnected");
    expect(endedOnB[0].payload.callId).toBe(incomingA.payload.callId);
    expect(endedOnB[0].payload.reason).toBe("caller-disconnected");

    // Session should be removed after cleanup.
    await calleeTabA.trigger("call-accepted", { callId: incomingA.payload.callId });
    const failedAfterCleanup = io.getEvents("callee-socket-7", "call-failed");
    expect(failedAfterCleanup.at(-1).payload.reason).toBe("session-not-found");
  });

  it("cleans up active session when accepted callee socket disconnects and notifies caller", async () => {
    const io = createMockIo();
    const caller = setupUser(io, "caller-socket-8", "caller-user-6");
    const callee = setupUser(io, "callee-socket-9", "callee-user-6");

    await caller.trigger("call-user", { targetUserId: "callee-user-6" });
    const incoming = io.getEvents("callee-socket-9", "incoming-call")[0];
    const callId = incoming.payload.callId;

    await callee.trigger("call-accepted", { callId });
    await callee.trigger("disconnect");

    const endedOnCaller = io.getEvents("caller-socket-8", "call-ended");
    expect(endedOnCaller).toHaveLength(1);
    expect(endedOnCaller[0].payload.callId).toBe(callId);
    expect(endedOnCaller[0].payload.reason).toBe("peer-disconnected");

    // Session should be removed after cleanup.
    await caller.trigger("webrtc-offer", {
      callId,
      offer: { type: "offer", sdp: "stale-offer" },
    });
    const failedAfterCleanup = io.getEvents("caller-socket-8", "call-failed");
    const staleOfferErrors = failedAfterCleanup.filter(
      (event) => event.payload.reason === "invalid-offer-route",
    );

    expect(staleOfferErrors).toHaveLength(0);
  });
});
