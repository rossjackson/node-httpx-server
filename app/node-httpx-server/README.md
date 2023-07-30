# node-httpx-server

A node http2 and beyond server dealing with streams

## Quickstart

For more details, check out `app/sample/src/index.ts`

```js
import http2, { constants } from 'http2'
import {
    CompleteProps,
    ErrorProps,
    HttpxServer,
    routerError,
} from 'node-httpx-server'
import { auth } from './middlewares/auth'
import companiesRouter from './routers/CompanyRouter'
import usersRouter from './routers/UserRouter'

const handleComplete = ({ stream, message }: CompleteProps) => {
    console.log(`Complete: ${message ?? 'no message'}`)
    stream.end(message)
}

const handleError = ({ error, stream }: ErrorProps<Error>) => {
    if (error instanceof Error) {
        if (error.name === routerError.NOT_FOUND) {
            stream.respond({
                [constants.HTTP2_HEADER_CONTENT_TYPE]:
                    'text/html; charset=utf-8',
                [constants.HTTP2_HEADER_STATUS]:
                    constants.HTTP_STATUS_NOT_FOUND,
            })
            stream.end()
            return
        }
    }
    console.log(error)
    stream.end(JSON.stringify(error))
}

const httpxServer = new HttpxServer({
    server: http2.createServer(),
    onComplete: handleComplete,
    onError: handleError,
})

httpxServer.router('/users', usersRouter)
httpxServer.router('/companies', auth, companiesRouter)

httpxServer.serve()
```

### Using preserve

```js
import http2, { constants } from 'http2'
import {
    CompleteProps,
    ErrorProps,
    HttpxServer,
    OnPreServeProps,
    routerError,
} from 'node-httpx-server'
import { auth } from './middlewares/auth'
import companiesRouter from './routers/CompanyRouter'
import usersRouter from './routers/UserRouter'

const handleComplete = ({ stream, message }: CompleteProps) => {
    console.log(`Complete: ${message ?? 'no message'}`)
    stream.end(message)
}

const handleError = ({ error, stream }: ErrorProps<Error>) => {
    if (error instanceof Error) {
        if (error.name === routerError.NOT_FOUND) {
            stream.respond({
                [constants.HTTP2_HEADER_CONTENT_TYPE]:
                    'text/html; charset=utf-8',
                [constants.HTTP2_HEADER_STATUS]:
                    constants.HTTP_STATUS_NOT_FOUND,
            })
            stream.end()
            return
        }
    }
    console.log(error)
    stream.end(JSON.stringify(error))
}

// If you want to handle something prior to the stream getting served

const handlePreServe = ({ error, next, source }: OnPreServeProps) => {
    console.log(`HandlePreServe headers: ${JSON.stringify(source.headers)}`)
    source.stream.respond({
        [constants.HTTP2_HEADER_STATUS]:
            constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
    })
    error(new Error('I want to stop'))
}

const httpxServer = new HttpxServer({
    server: http2.createServer(),
    onComplete: handleComplete,
    onError: handleError,
    onPreServe: handlePreServe,
})

httpxServer.router('/users', usersRouter)
httpxServer.router('/companies', auth, companiesRouter)

httpxServer.serve()
```

### Sample authentication middleware:

```js
import { constants } from 'http2'
import { StreamRouterCallbackProps } from 'node-httpx-server'

export const auth = ({ source, next, complete }: StreamRouterCallbackProps) => {
    const authorized = true
    if (authorized) {
        next()
        return
    }
    // is valid
    console.log('user is not authenticated')
    // next(source)
    source.stream.respond({
        [constants.HTTP2_HEADER_CONTENT_TYPE]: 'text/html; charset=utf-8',
        [constants.HTTP2_HEADER_STATUS]: constants.HTTP_STATUS_UNAUTHORIZED,
    })

    complete('Unauthorized')
}
```

### Sample Router

````js
import fs from 'fs'
import path from 'path'
import { auth } from '../middlewares/auth'
import { StreamRouter } from 'node-httpx-server'

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
        filename: string,
    };
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
````
