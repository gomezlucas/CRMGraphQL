const { ApolloServer } = require('apollo-server')
const typeDefs = require('./db/schema')
const resolvers = require('./db/resolvers')
const connectDB = require('./config/db')
const jwt = require('jsonwebtoken')

require('dotenv').config({path: 'variables.env'})


//Connect to the Database 

connectDB()

//Server 
const server = new ApolloServer({
    typeDefs,
    resolvers,
    context:({req})=>{
        const token = req.headers['authorization'] || ''
 
        if (token){
            try{
                 const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRETA )
                 return {usuario}
            }
            catch(error){
                console.log(error)
            }
        }
        
    }
})


// Run Server

server.listen({port: process.env.PORT || 4000 }).then(({ url }) => {
    console.log('Server Ready at the port', url)
})
