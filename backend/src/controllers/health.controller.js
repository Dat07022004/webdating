export const healthCheck = (req, res) => {
    res.status(200).json({ messsage: 'OK' });
};
