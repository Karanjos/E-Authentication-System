const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const session = require("express-session");
const qrcode = require("qrcode");
var Html5QrcodeScanner = require("html5-qrcode");

const app = express();
app.use(
  session({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true,
  })
);

app.set("view engine", "ejs");
app.engine("ejs", require("ejs").__express);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  isAdmin :{ type: Boolean, default: false },
});

const UserModel = new mongoose.model("User", userSchema);

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

// app.get("/verify-qr", function (req, res){
//   const qrData = toString(req.session.otp);
//       let config = {
//         fps: 5,
//         qrbox: {
//           width: 250,
//           height: 250,
//         },
//         rememberLastUsedCamera: true,
      
//       };
    
//       const scanner = new Html5QrcodeScanner("reader", config, false);
//       scanner.render(onScanSuccess, onScanFailure);
//       function onScanSuccess(result) {
//         if(qrData === result ){
//           res.render("user");
//           scanner.clear();
//           document.getElementById("reader").remove();
//         }
//       }
//       function onScanFailure(error) {
//         // handle scan failure, usually better to ignore and keep scanning.
//         // for example:
//         console.warn(`Code scan error = ${error}`);
//       }
    
// })

app.post("/register", async function (req, res) {
  try {
    const { firstName, lastName, email, password, city, zip } = req.body;
    const registeredUser = await UserModel.findOne({ email });
    if (registeredUser) {
      return res.status(409).json({ error: "Email already exists." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      city,
      zip,
    });

    await newUser.save();
    res.status(200).json({ message: "Registration successful" });
  } catch (err) {
    res.status(500).json({ error: "yaha par fault ara h " });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const verificationType = req.body.login_type;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid username" });
      return;
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({ message: "Invalid password" });
      return;
    }
    if (verificationType === "otp") {
      const OTP = Math.floor(Math.random() * 100000) + 1;
      console.log(OTP);
      req.session.otp = OTP;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "gjkaran397@gmail.com",
          pass: "oruwkgweztffzqxg",
        },
      });

      const mailOptions = {
        from: "your-email@gmail.com",
        to: email,
        subject: "Email OTP Verification",
        text: "Your OTP is " + OTP,
      };

      transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
          console.log(error);
          res.redirect("/login");
        } else {
          console.log("Email sent: " + info.response);
          res.render("verify-otp", { email });
        }
      });
    }
    if (verificationType === "qrcode") {
      const OTP = req.session.otp;
      const qrcodeData = toString(OTP);
      qrcode.toDataURL(qrcodeData, (err, src) => {
        res.render("verify-qr", {
          qr_code: src,
        });
      });
      
    }
  } catch (error) {
    console.log(error);
    res.redirect("/login");
  }
});

app.post("/login/verify-otp", function (req, res) {
  const  {inputOtp}  = req.body;
  const  OTP  = req.session.otp;
  const numOTP = Number(inputOtp);
  
  if(numOTP === OTP){
      res.render("user");
  }else {
    console.log("hi");
    // The OTPs do not match, so display an error message to the user.
    res.render("verify-otp", { error: "Incorrect OTP." });
  }
});

app.post("/login/verify-qr", function (req, res) {
  
  
});

app.listen(3000, () => console.log("Server is running on port 3000"));
