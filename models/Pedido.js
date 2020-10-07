const  mongoose = require("mongoose")


const PedidoSchema = mongoose.Schema({

    pedido: {
        type: Array,
        required: true
    },
    total:{
        type: Number, 
        required: true,
    },
    cliente:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true,
    },
    vendedor: {
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        ref: 'Usuario',
    },
    estado:{
        type:  String, 
        default: "PENDIENTE"
    },

})




module.exports = mongoose.model('Pedido', PedidoSchema)