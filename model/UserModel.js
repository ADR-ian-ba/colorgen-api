const mongoose = require ("mongoose")
const {Schema, model} = mongoose

const UserSchema = new Schema({
    username:{
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password:{
        type:String,
        required: true,
    },
    otp:{        
        type: Number,
        required:true,
    },
    isVerified :{
        type: Boolean,
        default: false,
    },
    createdAt:{
        type: Date,
        default: Date.now,
        expires: 600
    },
    colorPallete: [{
        palette:[{type:String}],
        color:[{type:String}],
        style:[{type:String}],
        theme:[{type:String}],
        number: {type: Number}
    }]
})

const UserModel = mongoose.model("User", UserSchema)
module.exports = UserModel