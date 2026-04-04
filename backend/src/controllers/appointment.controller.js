import { Appointment } from '../models/appointment.model.js';
import { User } from '../models/user.model.js';

export const createAppointment = async (req, res) => {
    try {
        const { receiverId, spotId, date, time, note } = req.body;
        
        // Use user attached by requireActiveUser middleware
        const currentUser = req.user;
        if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const appointment = new Appointment({
            senderId: currentUser._id,
            receiverId,
            spotId,
            date: new Date(date),
            time,
            note
        });

        await appointment.save();

        res.status(201).json({ 
            success: true, 
            message: 'Appointment created successfully',
            appointmentId: appointment._id 
        });
    } catch (error) {
        console.error('createAppointment error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getMyAppointments = async (req, res) => {
    try {
        const currentUser = req.user;
        if (!currentUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const appointments = await Appointment.find({
            $or: [{ senderId: currentUser._id }, { receiverId: currentUser._id }]
        }).populate('senderId receiverId', 'profile username');

        res.status(200).json({ success: true, appointments });
    } catch (error) {
        console.error('getMyAppointments error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
