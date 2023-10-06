//express and cors
const express = require("express")
const cors = require('cors');


const app = express()
app.use(express.json())
app.use(express.text())
app.use(cors())


//.env'
require("dotenv").config()
const mongodbColorgenLink = process.env.MONGODB_COLORGEN_LINK
const mongodbLinkJakartra = process.env.MONGO_DB_LINK_JAKARTA
const jwtSecretKey = process.env.JWT_SECRET_KEY
const emailUser = process.env.EMAIL_USER
const emailPass = process.env.EMAIL_PASS


//mongoose
const { default: mongoose } = require("mongoose")
const UserModel = require("./model/UserModel")
mongoose.connect(mongodbLinkJakartra)


//bcrypt
const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(11)


//jwt
const jwt = require("jsonwebtoken")
const secretKey = jwtSecretKey


//node mailer
const nodemailer = require("nodemailer")
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: emailUser,
        pass: emailPass
        //nqumcuwkdyikdwpy
    }
})


function generateOtp(){
    const min = 100000
    const max = 999999
    const otp = Math.floor(Math.random() * (max - min + 1)) + min
    return otp
}


app.post("/register", async(req,res)=>{
    const {username, password, email} = req.body


    if(username.length > 2 && username.length < 25 && password.length > 1){
        const hashedPassword = bcrypt.hashSync(password, salt)
        const otp = generateOtp()


        try{
            const foundUser = await UserModel.findOne({email: email})
            const checkName = await UserModel.findOne({username: username.toLowerCase()})
           
            if(checkName){
                res.json({type:"fail", exp:"username already taken"})
            }else{
                if(foundUser){
                    if (foundUser.isVerified === true){
                        console.log("user is already verified")
                        res.json({type:"success", exp:"email already verified"})
                    }else{
                        console.log("found same email unverif")
                        foundUser.password = hashedPassword;
                        foundUser.username = username.toLowerCase();
                        foundUser.otp = otp;
                        await foundUser.save();
   
                        const mailOptions = {
                            from: emailUser,
                            to: email,
                            subject: "Colorgen verify",
                            text: `please verify your email by clicking this link https://colorgen.onrender.com//verify?email=${email}&otp=${otp}`,
                        };
                        transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.log("Error occurred while sending email:", error);
                        } else {
                            console.log("Email sent successfully:", info.response);
                        }
                        });
                        res.json({type: "success", exp:"registration success, please check your email"})
                    }
   
                }else{
                    await UserModel.create({
                        username: username.toLowerCase(),
                        email: email,
                        password: hashedPassword,
                        otp: otp
                    })
   
                    const mailOptions = {
                        from: emailUser,
                        to: email,
                        subject: "Colorgen verify",
                        text: `please verify your email by clicking this link https://colorgen.onrender.com//verify?email=${email}&otp=${otp}`,
                    };
                    transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log("Error occurred while sending email:", error);
                        res.json({type:"fail", exp:"sending email went wrong"})
                    } else {
                        console.log("Email sent successfully:", info.response);
                        res.json({type:"success", exp:"registration success, please check your email"})
                    }
                    });
                }
            }            
        }catch(error){
            console.log(error)
            res.json({type:"fail", exp:"cant connect to db"})
        }
    }else{
        res.json({type: "fail", exp: "2 > username < 25 and, password > 1"})
    }
    console.log("registration succesfull")
})




app.post("/verify", async (req, res)=>{
    const {email, otp} = req.body


    try{
        const foundUser = await UserModel.findOne({email: email})


        if(foundUser.isVerified === true){
            console.log("user already verified")
            res.json("success")
        } else{
            const checkOtp = parseInt(foundUser.otp) === parseInt(otp)
            console.log(checkOtp)
            if(checkOtp){
                foundUser.isVerified = true
                foundUser.createdAt = undefined
                foundUser.otp = generateOtp()
                await foundUser.save()


                res.json("success")


            }else{
                console.log("Token Invalid")
                res.json("fail")
            }
        }
    }catch(error){
        console.log("user not found")
        res.json("fail")
    }
})


app.post("/login", async(req, res)=>{
    const {name, password} = req.body
    console.log(name, password)
    console.log( name.toLowerCase())
   
    try{
        const foundUser = await UserModel.findOne({username : name.toLowerCase()})
        console.log(foundUser)
        if(foundUser){
            if(foundUser.isVerified){
                const passOk = bcrypt.compareSync(password, foundUser.password)


                console.log("user is verified")
                if(passOk){
                    const payLoad = {
                        username: foundUser.username.toLowerCase(),
                        authorized: true,
                    }


                    const token = jwt.sign(payLoad, secretKey, {expiresIn: "5h"})
                    res.json({
                        type:"success",
                        exp:"Login successful",
                        token: token,
                        username:foundUser.username.toLowerCase(),
                        authorized:true})


                    console.log("pass is verivied")
                    console.log("sending token")


                }else{
                    res.json({type:"fail", exp:"wrong password"})
                    console.log("wrong pass")
                }
            }else{
                res.json({type:"fail", exp:"not verified, pleasecheck mail"})
                console.log("not verified")
            }
        }else{
            res.json({type:"fail", exp:"username not found"})
            console.log("username not found")
        }




    }catch(error){
        console.log(error)
    }
})


app.post("/validateToken", async(req, res)=>{
    const token = req.headers.authorization


    if(token === null){
        res.json("there is no token")
    }else{
        try{
            jwt.verify(token, jwtSecretKey, async(err, decoded)=>{
            if(err){
                res.json("wrong token")
            } else if(decoded === undefined){


            }else{
                console.log(decoded)


                const username = decoded.username.toLowerCase()
                const authorization = decoded.authorized


                const foundUser = await UserModel.findOne({username:username})
                const completeColor = []


                for(let i=0; i<foundUser.colorPallete.length ; i++){
                    let data = {
                        color : foundUser.colorPallete[i]["palette"],
                        id: foundUser.colorPallete[i]["_id"]
                    }
                    completeColor.push(data)
                }


                console.log(completeColor)




                res.json({username, authorization, completeColor})
            }




        })
        }catch(error){
            res.json("there is no token")
            console.log(error)
        }
       
    }
})




app.post("/forgetusername", async (req, res)=>{
    const email = req.body.email
    console.log(email)


    try{
        const foundUser = await UserModel.findOne({email: email})
        const username = foundUser.username.toLowerCase()
        const mailOptions = {
            from: emailUser,
            to: email,
            subject: "Colorgen verify",
            text: `your username is ${username}`,
        };
        transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error occurred while sending email:", error);
            res.json({type:"fail", exp:"sending email went wrong"})
        } else {
            console.log("Email sent successfully:", info.response);
            res.json({type:"success", exp:"please check your email"})
        }
        });
        console.log(foundUser)


    }catch(error){
        res.json({type: "fail", exp: "email not yet registered"})
    }
})


app.post("/forgetpassword", async(req, res)=>{
    const email = req.body.email
    console.log(email)


    try{
        const foundUser = await UserModel.findOne({email: email})
        const otp = generateOtp()
        foundUser.otp = otp
        foundUser.save()


        const mailOptions = {
            from: emailUser,
            to: email,
            subject: "Colorgen verify",
            text: `change your password here https://colorgen.onrender.com//verifyforgetpassword?email=${email}&otp=${otp}`,
        };
        transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error occurred while sending email:", error);
            res.json({type:"fail", exp:"sending email went wrong"})
        } else {
            console.log("Email sent successfully:", info.response);
            res.json({type:"success", exp:"please check your email"})
        }
        });


    }catch(error){
        console.log(error)
        res.json({type: "fail", exp: "email not yet registered"})
    }
})


app.post("/verifyforgetpassword", async(req, res)=>{
    const {email, password, otp} = req.body
    console.log(email, password, otp)
    if(password.length > 1){
        try{
            const foundUser = await UserModel.findOne({email: email})
            const checkOtp = parseInt(foundUser.otp) === parseInt(otp)
            if(checkOtp){
                foundUser.otp = generateOtp()
                foundUser.password = bcrypt.hashSync(password, salt)
                foundUser.save()
                res.json({type:"success", exp:"change password succesfull"})
            }else{
                res.json({type:"fail", exp:"wrong otp"})
            }


        }catch(error){
            console.log(error)
            res.json({type:"fail", exp:"email not yet registered"})


        }
    }else{
       res.json({type:"fail", exp:"new password > 1"})
    }


})


app.post("/save", async(req,res)=>{
    const data = req.body
    console.log(data)


    try{
        foundUser = await UserModel.findOne({username : data.username})
        console.log(foundUser)
        if(foundUser.colorPallete.length <= 50){
            const newData = {
                palette : data.pallete,
                color: [],
                style: [],
                theme : [],
                number: data.pallete.length
            }
            console.log(newData)
           
            const updatedUser = await UserModel.findOneAndUpdate(
                {username : data.username},
                {$push : {colorPallete: newData}},
                {new : true}
            )


            const completeColor = []


            for(let i=0; i<updatedUser.colorPallete.length ; i++){
                let data = {
                    color : updatedUser.colorPallete[i]["palette"],
                    id: updatedUser.colorPallete[i]["_id"]
                }
                completeColor.push(data)
            }
            console.log(completeColor)


            res.json({type:"success", exp:"pallette saved", dbPallette: completeColor})
            console.log(typeof completeColor)
           
        }else{
            res.json({type:"fail", exp:"max pallette reached"})
        }
    }catch(error){
        console.log(error)
        res.json({type:"fail", exp:"cannot connect to data"})
    }


})


app.post("/deletepallette", async(req, res)=>{
    const {id, username} = req.body
    console.log(id, username)


    try{
        const updatedUser = await UserModel.findOneAndUpdate(
            { username: username },
            { $pull: { colorPallete: { _id: id } } },
            { new: true }
          );
          console.log("test")


          const completeColor = []


          for(let i=0; i<updatedUser.colorPallete.length ; i++){
              let data = {
                  color : updatedUser.colorPallete[i]["palette"],
                  id: updatedUser.colorPallete[i]["_id"]
              }
              completeColor.push(data)
          }
          console.log(completeColor)
       
        res.json({type:"success", exp:"pallette deleted", dbPallette: completeColor})


    }catch(error){
        console.log(error)
    }
})


app.listen(4000)



