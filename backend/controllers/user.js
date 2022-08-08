const User = require('../models/user');
const EmailVerificationToken = require('../models/emailVerificationToken');
const jwt = require('jsonwebtoken');
const { isValidObjectId } = require('mongoose');
const PasswordResetToken = require('../models/passwordResetToken');

const { generateOTP, generateMailTransporter } = require('../utils/mail');
const { sendError, generateRandomBtye } = require('../utils/helper');

exports.create = async (req, res) => {
    const { name, email, password } = req.body;

    const oldUser = await User.findOne({ email: email });

    if (oldUser) return sendError(res, "This email is already in use!");
    const newUser = new User({ name, email, password });
    await newUser.save();

    // generate 6 digit otp

    let OTP = generateOTP();

    // store the otp inside our db

    const newEmailVerificationToken = new EmailVerificationToken({ owner: newUser._id, token: OTP, });

    await newEmailVerificationToken.save();

    // send that otp to our user
    var transport = generateMailTransporter();

    transport.sendMail({
        from: 'verification@moviereviewapp.com',
        to: newUser.email,
        subject: 'Email Verification',
        html: `
          <p> Your verification OTP</p>
          <h1>${OTP}</h1>
          `
    });

    res.status(201).json({ user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
    }, });
};

exports.verifyEmail = async (req, res) => {
    const { userId, OTP } = req.body;
    if (!isValidObjectId(userId)) return res.json({ error: "Invalid user!" });

    const user = await User.findById(userId);
    if (!user) return sendError(res, "User not found!", 404);

    if (user.isVerified) return sendError(res, "User is already verified!");

    const token = await EmailVerificationToken.findOne({ owner: userId });
    if (!token) return sendError(res, "Token not found!");

    const isMatched = await token.compareToken(OTP)
    if (!isMatched) return sendError(res, "Wrong OTP. Please try again");

    user.isVerified = true;
    await user.save();

    await EmailVerificationToken.findByIdAndDelete(token._id);


    var transport = generateMailTransporter();

    transport.sendMail({
        from: 'verification@moviereviewapp.com',
        to: user.email,
        subject: 'Welcome Email',
        html: `
          <h1>Welcome to our movie review app!</h1>
          `,
    });
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({user: {id: user._id, name: user.name, email: user.email, token:jwtToken}, 
    message: "Your account is verified" });

};

exports.resendEmailVerificationToken = async (req, res) => {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) return sendError(res, "User not found!");

    if (user.isVerified) return sendError(res, "This email is already verified!");

    const alreadyHasToken = await EmailVerificationToken.findOne({ owner: userId });
    if (alreadyHasToken) return sendError(res, "You can request for a new token only after 1 hour!");


    let OTP = generateOTP();

    // store the otp inside our db

    const newEmailVerificationToken = new EmailVerificationToken({ owner: user._id, token: OTP, });

    await newEmailVerificationToken.save();

    // send that otp to our user
    var transport = generateMailTransporter();

    transport.sendMail({
        from: 'verification@moviereviewapp.com',
        to: user.email,
        subject: 'Email Verification',
        html: `
          <p> Your verification OTP</p>
          <h1>${OTP}</h1>
          `
    });

    res.json({ message: 'A new OTP code has been sent to your Email address!' });
};

exports.forgetPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return sendError(res, "Email is missing!");

    const user = await User.findOne({ email });
    if (!user) return sendError(res, "User is missing!", 404);

    const alreadyHasToken = await PasswordResetToken.findOne({ owner: user._id });
    if (alreadyHasToken) return sendError(res, "You can request for a new token only after 1 hour!");

    const token = await generateRandomBtye();
    const newPasswordResetToken = await PasswordResetToken({ owner: user._id, token });
    await newPasswordResetToken.save();

    const resetPasswordUrl = `http://localhost:3000/reset-password?token=${token}&id=${user._id}`;

    const transport = generateMailTransporter();

    transport.sendMail({
        from: 'security@moviereviewapp.com',
        to: user.email,
        subject: 'Reset Password Link',
        html: `
          <p>Click here to reset your password</p>
          <a href='${resetPasswordUrl}'>Change Password</a>
          `,
    });

    res.json({ message: 'Link has been sent to your Email address!' })
};

exports.sendResetPasswordTokenStatus = (req, res) => {
    res.json({ valid: true });
};

exports.resetPassword = async (req, res) => {
    const { newPassword, userId } = req.body;
    const user = await User.findById(userId);
    const matched = await user.comparePassword(newPassword);
    if (matched) return sendError(res, "The new password most be different from the old one!");

    user.password = newPassword;
    await user.save();

    await PasswordResetToken.findByIdAndDelete(req.resetToken._id);

    const transport = generateMailTransporter();

    transport.sendMail({
        from: 'security@moviereviewapp.com',
        to: user.email,
        subject: 'Password Reset Successfully',
        html: `
          <h1>Password Reset Successfully!</h1>
          <p>You can use your new password now.</p>
          `,
    });

    res.json({ message: "Password reset successfully, You can use your new password now" });
};

exports.signIn = async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return sendError(res, "Email or Password is mismatch!");

    const matched = await user.comparePassword(password);
    if (!matched) return sendError(res, "Email or Password is mismatch!");

    const { _id, name } = user;
    const jwtToken = jwt.sign({ userId: _id }, process.env.JWT_SECRET);

    res.json({ user: { id: _id, name, email, token: jwtToken } })

};