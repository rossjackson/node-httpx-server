import { IncomingHttpHeaders, ServerHttp2Stream, constants } from 'http2'
import { routerError } from './constants'
import { CompleteProps, ErrorProps } from './httpxServer'
import StreamRouter from './streamRouter'

export interface StreamSourceProps {
    stream: ServerHttp2Stream
    headers: IncomingHttpHeaders
    flags: number
}

export type MethodType =
    | 'DELETE'
    | 'GET'
    | 'HEAD'
    | 'OPTIONS'
    | 'PATCH'
    | 'POST'
    | 'PUT'

export type PathParametersType = Record<string, string>

export interface StreamRouterCallbackProps {
    /**
     * Calls unload() and stream.end()
     * @param {string | undefined} message Last message to send out
     * @returns {void}
     */
    complete: (message?: string) => void
    error: <TError extends Error>(props: TError) => void
    next: VoidFunction
    source: StreamSourceProps
    pathParameters?: PathParametersType
}

export type StreamRouterCallbackType = (
    props: StreamRouterCallbackProps
) => void

export type RoutersValueType = StreamRouter | StreamRouterCallbackType

export interface HttpxServerRecurseCallbacksProps {
    callbacks: RoutersValueType[]
    onComplete: (props: CompleteProps) => void
    onError: <TError extends Error>(props: ErrorProps<TError>) => void
    pathParameters?: PathParametersType
    source: StreamSourceProps
    truncatedPath: string
}

export const recurseCallbacks = ({
    callbacks,
    onComplete,
    onError,
    pathParameters,
    source,
    truncatedPath,
}: HttpxServerRecurseCallbacksProps) => {
    const [callback, ...restOfCallbacks] = callbacks
    const handleComplete = (message?: string) =>
        onComplete({ message, stream: source.stream })
    const handleError = <TError extends Error>(error: TError) =>
        onError<TError>({ error, stream: source.stream })
    const handleNext = () => {
        if (callback instanceof StreamRouter) {
            callback.process({
                currentPath: truncatedPath,
                onComplete,
                onError,
                pathParameters,
                source,
            })
            return
        }

        if (restOfCallbacks.length === 0) return
        recurseCallbacks({
            callbacks: restOfCallbacks,
            onComplete,
            onError,
            pathParameters,
            source,
            truncatedPath,
        })
    }

    if (callback instanceof StreamRouter) {
        callback.process({
            currentPath: truncatedPath,
            onComplete,
            onError,
            pathParameters,
            source,
        })
        return
    }

    callback({
        complete: handleComplete,
        error: handleError,
        next: handleNext,
        pathParameters,
        source,
    })
}

export interface ProcessRoutesProps {
    currentPath: string
    onComplete: (props: CompleteProps) => void
    onError: <TError extends Error>(props: ErrorProps<TError>) => void
    pathParameters?: PathParametersType
    routers: Map<[string, string?], RoutersValueType[]>
    source: StreamSourceProps
}

export const processRoutes = ({
    currentPath,
    onComplete,
    onError,
    pathParameters,
    routers,
    source,
}: ProcessRoutesProps) => {
    const routeEntry = [...routers.entries()].find(
        ([[path, method], callbacks]) => {
            let pathFound = false

            const currentPathArr = currentPath.split('/').slice(1)
            const pathArr = path.split('/').slice(1)

            /**
             * If currentPath contains key path from router, check if its a nested route
             * If nestedRoute, return true (let the next recurse handle it)
             * else check if current path is the exact route for path
             */
            if (currentPathArr[0] === pathArr[0]) {
                let nestedRoute = callbacks.some(
                    (callback) => callback instanceof StreamRouter
                )

                if (!nestedRoute)
                    // must be an exact route
                    pathFound = currentPath.length === pathArr.length
                else pathFound = true
            }

            if (pathArr[0].startsWith('{') && pathArr[0].endsWith('}')) {
                pathParameters = {
                    ...(pathParameters ?? {}),
                    [pathArr[0].substring(1, pathArr[0].length - 1)]:
                        currentPathArr[0],
                }
                pathFound = true
            }

            return (
                pathFound &&
                (!method ||
                    source.headers[constants.HTTP2_HEADER_METHOD] === method)
            )
        }
    )

    if (!routeEntry) {
        const notFoundError = new Error('Not found')
        notFoundError.name = routerError.NOT_FOUND
        onError({
            error: notFoundError,
            stream: source.stream,
        })
        return
    }

    const [[path], callbacks] = routeEntry

    recurseCallbacks({
        callbacks,
        onComplete,
        onError,
        pathParameters,
        source,
        truncatedPath:
            currentPath.length === path.length
                ? '/'
                : currentPath.substring(path.length),
    })
}
