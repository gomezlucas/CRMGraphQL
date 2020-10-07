const Usuario = require('../models/Usuario')
const Producto = require('../models/Producto')
const Cliente = require('../models/Cliente')
const Pedido = require('../models/Pedido')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: 'variables.env' })



const crearToken = (usuario, secreta, expiresIn) => {
    const { id, email, nombre, apellido } = usuario
    return jwt.sign({ id, email, nombre }, secreta, { expiresIn })
}


// Resolver
const resolvers = {
    Query: {
        obtenerUsuario: async (_, {}, ctx) => {
             return ctx.usuario
        },
        obtenerProducto: async (_, { id }) => {
            const idExiste = await Producto.findOne({ _id: id })

            if (!idExiste) {
                throw new Error('El producto no se encuentra registrado')
            }
            return idExiste
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({})
                return productos
            } catch (e) {
                console.log(e)
            }
        },
        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({})
                return clientes
            } catch (e) {
                console.log(e)
            }
        },
        obtenerClientexVendedor: async (_, { }, ctx) => {
            const vendedor = ctx.usuario.id
            try {
                const clientes = await Cliente.find({ vendedor: vendedor })
                return clientes

            } catch (e) {
                console.log(e)
            }
        },
        obtenerCliente: async (_, { id }, ctx) => {
            const vendedor = ctx.usuario.id
            const cliente = await Cliente.findById(id)

            if (!cliente) {
                throw new Error("El Cliente no existe")
            }
            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error("No tiene las credenciales")
            }
            return cliente
        },
        obtenerPedidos: async () => {
            try {
                const pedidos = await Pedido.find({})
                return pedidos
            } catch (error) {
                console.log(error)
            }
        },
        obtenerPedidosxVendedor: async (_, { }, ctx) => {

            const vendedor = ctx.usuario.id


            try {
                const pedidos = await Pedido.find({ vendedor: vendedor }).populate('cliente')
                return pedidos
            } catch (e) {
                console.log(e)
            }

        },
        obtenerPedido: async (_, { id }, ctx) => {
            const vendedor = ctx.usuario.id

            const pedido = await Pedido.findById(id)

            if (!pedido) {
                throw new Error("El Pedido no existe")
            }
            if (pedido.vendedor.toString() !== vendedor) {
                throw new Error("No tiene las credenciales")
            }
            return pedido
        },
        obtenerPedidoxEstado: async (_, { estado }, ctx) => {

            const pedidos = await Pedido.find({ vendedor: ctx.usuario.id , estado })

            return pedidos

        },
        mejoresClientes: async() => {

            const clientes = await Pedido.aggregate([
                {$match: {estado: "COMPLETADO"}},
                { $group: {
                    _id: "$cliente",
                    total: {$sum: '$total'}
                }},
                {
                    $lookup: {  
                        from: 'clientes', 
                        localField: '_id',
                        foreignField: '_id',
                        as: 'cliente'
                    }
                }
            ])
            return clientes 
            
        },
        mejoresVendedores: async() =>{
            const vendedores = await Pedido.aggregate([
                {$match: {estado: "COMPLETADO"}},
                { $group:{
                    _id: "$vendedor",
                    total: {$sum: '$total'}
                }},
                {
                    $lookup:{
                        from: 'usuarios',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'vendedor'
                    }
                },
                {
                    $limit: 3
                },
                {
                    $sort: {total: -1}
                }
            ])
            return vendedores
        },

        obtenerProductosxNombre:  async(_, {nombre})=>{
            const productos =  await Producto.find({$text: {$search: nombre}})

            return productos

        }
    },
    Mutation: {
        nuevoUsuario: async (_, { input }) => {
            const { email, password } = input
            //Verificar si existe
            const existeUsuario = await Usuario.findOne({ email })

            if (existeUsuario) {
                throw new Error('El usuario se encuentra registrado')
            }
            //Hashear el password
            const salt = await bcryptjs.genSalt(10)
            input.password = await bcryptjs.hash(password, salt)
            // crear nuevo Usuario
            try {
                const usuario = new Usuario(input)
                usuario.save()
                return usuario
            } catch (error) {
                console.log(error)
            }
        },
        autenticarUsuario: async (_, { input }) => {
            const { email, password } = input
            //Verificar si usuario existe   
            const usuarioExiste = await Usuario.findOne({ email })
            if (!usuarioExiste) {
                throw new Error('el usuario no Existe')
            }
            // Verificar si password es correcto
            const passwordCorrecto = await bcryptjs.compare(password, usuarioExiste.password)
            if (!passwordCorrecto) {
                throw new Error('El password no es el correcto')
            }
            // Generar Token
            return {
                token: crearToken(usuarioExiste, process.env.SECRETA, '24h')
            }
        },
        nuevoProducto: async (_, { input }) => {
            try {
                const producto = new Producto(input)

                //almacenar en la base de datos
                const resultado = await producto.save()
                return resultado
            } catch (e) {
                console.log(e)
            }
        },
        actualizarProducto: async (_, { id, input }) => {
            let producto = await Producto.findById(id)
            if (!producto) {
                throw new Error("el Producto no existe")
            }
            producto = await Producto.findOneAndUpdate({ _id: id }, input, { new: true })
            return producto
        },
        eliminarProducto: async (_, { id }) => {
            let producto = await Producto.findById(id)
            if (!producto) {
                throw new Error("el Producto no existe")
            }
            //eliminar
            await Producto.findOneAndDelete({ _id: id })
            return "Producto eliminado"
        },
        nuevoCliente: async (_, { input }, ctx) => {

            //Verificar si el cliente Existe
            const { email } = input

            let cliente = await Cliente.findOne({ email })

            if (cliente) {
                throw new Error("El cliente ya se encuentra registrado")
            }

            const nuevoCliente = new Cliente(input)
            // asignar vendedor
            nuevoCliente.vendedor = ctx.usuario.id

            //guardarlo en la base de datos

            const resultado = await nuevoCliente.save()

            return resultado
        },
        actualizarCliente: async (_, { id, input }, ctx) => {

            const vendedor = ctx.usuario.id
            let cliente = await Cliente.findById(id)

            if (!cliente) {
                throw new Error("El cliente no existe")
            }


            if (cliente.vendedor.toString() !== vendedor) {
                throw new Error("No tiene las credenciales")
            }

            cliente = await Cliente.findOneAndUpdate({ _id: id }, input, { new: true })

            return cliente
        },

        eliminarCliente: async (_, { id }, ctx) => {
            let cliente = await Cliente.findById(id)
            let vendedor = ctx.usuario.id
            if (!cliente) {
                throw new Error("El cliente no existe")
            }
            if (cliente.vendedor.toString() !== vendedor) {
                throw new Error("No tiene las credenciales")
            }
            cliente = await Cliente.findOneAndDelete({ _id: id })
            return "El Cliente se ha eliminado "
        },

        nuevoPedido: async (_, { input }, ctx) => {
            // verificar si cliente existe
            const { cliente } = input
            let clienteExiste = await Cliente.findById(cliente)
            if (!clienteExiste) {
                throw new Error("El cliente no existe")
            }
            // verificar si el usuario es del vendedor
            if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
                throw new Error("No tiene las credenciales")
            }
            //  Revisar que el stock este disponible
            for await (const articulo of input.pedido) {
                const { id } = articulo
                const producto = await Producto.findById(id)
                console.log(articulo.cantidad, producto.existencia)
                if (articulo.cantidad > producto.existencia) {
                    throw new Error(`el producto ${producto.nombre} excede la cantidad disponible en Stock`)
                } else {
                    producto.existencia = producto.existencia - articulo.cantidad

                    await producto.save()
                }
            }
            // Crear un nuevo Pedido
            let nuevoPedido = new Pedido(input)

            // asignarle un vendedor
            nuevoPedido.vendedor = ctx.usuario.id


            // Guardarlo en la base de datos 
            nuevoPedido.save()

            return nuevoPedido

        },
        actualizarPedido: async (_, { id, input }, ctx) => {

            let vendedor = ctx.usuario.id

            let pedidoExiste = await Pedido.findById(id)

            if (!pedidoExiste) {
                throw new Error("El Pedido no existe")
            }

            if (pedidoExiste.vendedor.toString() !== vendedor) {
                throw new Error("No tiene las credenciales")
            }


            if (input.pedido) {
                for await (const articulo of input.pedido) {
                    const { id } = articulo
                    const producto = await Producto.findById(id)
                    console.log(articulo.cantidad, producto.existencia)
                    if (articulo.cantidad > producto.existencia) {
                        throw new Error(`el producto ${producto.nombre} excede la cantidad disponible en Stock`)
                    } else {
                        producto.existencia = producto.existencia - articulo.cantidad

                        await producto.save()
                    }
                }
            }


            pedidoExiste = await Pedido.findOneAndUpdate({ _id: id }, input, { new: true })

            return pedidoExiste

        },
        eliminarPedido: async (_, { id }, ctx) => {
            // Verificiar si el pedido existe

            let pedidoExiste = await Pedido.findById(id)
            const vendedor = ctx.usuario.id

            if (!pedidoExiste) {
                throw new Error("El pedido no Existe")
            }

            // Verificar si el vendedor es el due;o del pedido
            if (pedidoExiste.vendedor.toString() !== vendedor) {
                throw new Error("No tiene las credenciales")
            }

            // eliminar el pedido
            pedidoExiste = await Pedido.findOneAndDelete({ _id: id })
            return "El Cliente se ha eliminado "
        }

    }

}



module.exports = resolvers