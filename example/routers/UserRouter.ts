import StreamRouter from '../../src/streamRouter'
import { auth } from '../middlewares/auth'

const usersRouter = new StreamRouter()

usersRouter.get(
    '/',
    auth,
    ({ source, pathParameters, searchParams, complete }) => {
        const { stream } = source
        console.log('pathParameters', pathParameters)
        console.log('searchParams', searchParams)
        stream.write('inside userRouter', () => {
            complete()
        })
    }
)

usersRouter.get(
    '/{id}',
    auth,
    async ({ source, pathParameters, searchParams, complete }) => {
        const { stream } = source
        console.log('pathParameters', pathParameters)
        console.log('searchParams', searchParams)
        stream.write('inside usersRouter', () => {
            complete()
        })
    }
)

export default usersRouter
