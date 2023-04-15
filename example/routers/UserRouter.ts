import StreamRouter from '../../src/streamRouter'
import { auth } from '../middlewares/auth'

const usersRouter = new StreamRouter()

usersRouter.get('/', auth, ({ source, complete }) => {
    const { stream } = source
    stream.write('inside userRouter', () => {
        complete()
    })
})

usersRouter.get('/{id}', auth, async ({ source, pathParameters, complete }) => {
    const { stream } = source
    console.log(pathParameters?.id)
    stream.write('inside usersRouter', () => {
        complete()
    })
})

export default usersRouter
