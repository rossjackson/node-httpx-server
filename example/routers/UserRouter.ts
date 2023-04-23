import fs from 'fs'
import path from 'path'
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

/**
 * Sample file upload with metadata of the file.
 * 
 * On Client:
 * ```
 *     request.write(
        JSON.stringify({
            imageInfo: {
                filename: 'myProfile.jpg',
            },
        }),
        () => {
            const sampleFileStream = fs.createReadStream(
                path.resolve(__dirname, '../Sample-jpg-image-10mb.jpg')
            )

            sampleFileStream.on('data', (chunk) => request.write(chunk))

            sampleFileStream.on('end', () => request.end())
        }
    )
 * ```
 */

interface SampleMetadataProps {
    imageInfo: {
        filename: string
    }
}

usersRouter.post('/add', auth, async ({ source, complete, error }) => {
    const { stream } = source

    let fileBufferArr: Buffer[] = []
    let metadata: SampleMetadataProps | undefined

    stream.on('data', (data: Buffer) => {
        if (!metadata) {
            metadata = JSON.parse(data.toString())
            return
        }
        fileBufferArr.push(data)
    })

    stream.on('end', () => {
        if (!metadata) return

        fs.writeFile(
            path.resolve(__dirname, `./${metadata.imageInfo.filename}`),
            Buffer.concat(fileBufferArr),
            () => {
                complete('done')
            }
        )
    })

    stream.on('error', (err) => {
        console.log('error', err)
        error(err)
    })
})

export default usersRouter
