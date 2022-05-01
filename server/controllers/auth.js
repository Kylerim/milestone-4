const { application } = require("express");
const nodemailer = require("nodemailer");
const { GROUP_ID, IS_PRODUCTION_MODE } = require("../common");
const { User } = require("../models/User");

exports.adduser = (req, res) => {
    res.setHeader("X-CSE356", GROUP_ID);
    console.log(req.body);
    const { name, email, password } = req.body;

    User.findOne({ name }).exec((err, user) => {
        if (user) {
            res.json({ error: true, message: "username already exists" });
            return;
        } else {
            let randomKey = Math.random().toString(36).substring(2, 9);
            console.log({ email: email, key: randomKey });
            let newUser = new User({ name, email, password, key: randomKey });
            const encoded_email = encodeURI(email);

            //send email
            const output = `
			 	<p>Please VERIFY Account</p>
			 	<ul>  
			 	<li>Email: ${email}</li>
			 	<li>Key: ${randomKey}</li>
			 	</ul>
			 	<h3>Message</h3>
			 	<a href="
			 	http://kylerim.cse356.compas.cs.stonybrook.edu/users/verify?key=${randomKey}">
			 	http://kylerim.cse356.compas.cs.stonybrook.edu/users/verify?key=${randomKey} </a>
			 `;
            console.log(
                "http://kylerim.cse356.compas.cs.stonybrook.edu/users/verify?key=" +
                    randomKey
            );
            if (IS_PRODUCTION_MODE) {
                let transporter = nodemailer.createTransport({
                    service: "postfix",
                    host: "kylerim.cse356.compas.cs.stonybrook.edu",
                    secure: false,
                    port: 587,
                    auth: {
                        user: "root@kylerim.cse356.compas.cs.stonybrook.edu",
                        pass: "kylerim",
                    },
                    tls: { rejectUnauthorized: false },
                });

                let mailOptions = {
                    from: "root@kylerim.cse356.compas.cs.stonybrook.edu",
                    to: email,
                    subject: "Verification Kylerim",
                    text: "Verification",
                    html: output, // html body
                };

                //  send mail with defined transport object
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        res.json({
                            error: true,
                            message: "Error sending email",
                        });
                        return console.log(error);
                    }

                    console.log("Message sent: %s", info.messageId);
                    console.log(
                        "Preview URL: %s",
                        nodemailer.getTestMessageUrl(info)
                    );

                    newUser.save((err, success) => {
                        if (err) {
                            res.json({
                                error: true,
                                message: "error with sign up " + err,
                            });
                            return;
                        } else {
                            console.log("Saved Sucessfully");
                            res.json({
                                status: "ok",
                                message:
                                    "Signup Successful! Please Verify Account in your email",
                            });
                        }
                    });
                });
            } else {
                newUser.save((err, success) => {
                    if (err) {
                        res.json({
                            error: true,
                            message: "error with sign up " + err,
                        });
                        return;
                    } else {
                        console.log("Saved Sucessfully");
                        res.json({
                            status: "ok",
                            message:
                                "Signup Successful! Please Verify Account in your email",
                        });
                    }
                });
            }
        }
    });
};

exports.login = (req, res) => {
    res.setHeader("X-CSE356", GROUP_ID);
    console.log("Login Requested Body: ", req.body);

    if (req.session.user) {
        console.log(req.session.user, " has logged in with session.");

        User.findOne({ name: req.session.user }).exec((err, user) => {
            if (err) {
                res.json({
                    error: true,
                    message: "Error in fetching data from db",
                });
                return;
            } else if (!user) {
                req.session.destroy();
                res.json({
                    error: true,
                    message: "No user with corresponding username",
                });
                return;
            } else {
                console.log("login with session: " + req.session.user);
                res.json({ status: "ok", message: "Login with session" });
                return;
            }
        });
    } else {
        const { email, password } = req.body;
        if (email && password) {
            //LOGIN
            User.findOne({ email }).exec((err, user) => {
                if (err) {
                    res.json({
                        error: true,
                        message: "Error in fetching data from db",
                    });
                    return;
                }
                if (!user) {
                    res.json({
                        error: true,
                        message:
                            "No user with corresponding username and password",
                    });
                    return;
                }
                const dbPassword = user.password;
                if (password != dbPassword) {
                    res.json({ error: true, message: "Incorrect password" });
                    return;
                } else if (!user.isVerified) {
                    res.json({
                        error: true,
                        message: "User is not verified yet",
                    });
                    return;
                } else {
                    req.session.user = user.name;
                    req.session.save(() => {
                        console.log(
                            "Saved a new session for: ",
                            req.session.user
                        );
                        res.json({
                            status: "ok",
                            name: req.session.user,
                        });
                        return;
                    });
                }
            });
        } else {
            res.json({
                error: true,
                message: "no username/pw provided | no session found yet",
            });
            return;
        }
    }
};

exports.verify = (req, res) => {
    res.setHeader("X-CSE356", GROUP_ID);
    console.log(req.body);
    const key = req.query.key;
    console.log("key: " + key);

    User.findOne({ key }).exec((err, user) => {
        console.log(user);
        if (user) {
            User.findOneAndUpdate(
                { key },
                { isVerified: true },
                (err, user) => {
                    if (!user) {
                        res.json({ error: true, message: "SignUp ERROR" });
                        console.log(
                            "Error with verifying when user is true: ",
                            err
                        );
                        return;
                    } else {
                        res.json({
                            status: "ok",
                            message:
                                "SignUp successfully! Your account is activated.",
                        });
                        return;
                    }
                }
            );
        } else {
            res.json({ error: true, message: "No such key" });
            return;
        }
    });
};

exports.logout = (req, res) => {
    res.setHeader("X-CSE356", GROUP_ID);
    req.session.destroy(() => {
        return res.json({ status: "ok", message: "logged out" });
    });
};
