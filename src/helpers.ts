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

export interface StreamRouterCallbackProps<TError = Error> {
    /**
     * Calls unload() and stream.end()
     * @param {string | undefined} message Last message to send out
     * @returns {void}
     */
    complete: (message?: string) => void
    error: (props: TError) => void
    next: VoidFunction
    source: StreamSourceProps
}

export type StreamRouterCallbackType = (
    props: StreamRouterCallbackProps
) => void

export type RoutersValueType = StreamRouter | StreamRouterCallbackType

export interface HttpxServerRecurseCallbacksProps {
    callbacks: RoutersValueType[]
    onComplete: (props: CompleteProps) => void
    onError: <TError = Error>(props: ErrorProps<TError>) => void
    source: StreamSourceProps
    truncatedPath: string
}

export const recurseCallbacks = ({
    callbacks,
    onComplete,
    onError,
    source,
    truncatedPath,
}: HttpxServerRecurseCallbacksProps) => {
    const [callback, ...restOfCallbacks] = callbacks
    const handleComplete = (message?: string) =>
        onComplete({ message, stream: source.stream })
    const handleError = <TError = Error>(error: TError) =>
        onError<TError>({ error, stream: source.stream })
    const handleNext = () => {
        if (callback instanceof StreamRouter) {
            callback.process({
                currentPath: truncatedPath,
                onComplete,
                onError,
                source,
            })
            return
        }

        if (restOfCallbacks.length === 0) return
        recurseCallbacks({
            callbacks: restOfCallbacks,
            onComplete,
            onError,
            source,
            truncatedPath,
        })
    }

    if (callback instanceof StreamRouter) {
        callback.process({
            currentPath: truncatedPath,
            onComplete,
            onError,
            source,
        })
        return
    }

    callback({
        complete: handleComplete,
        error: handleError,
        next: handleNext,
        source,
    })
}

export interface ProcessRoutesProps {
    currentPath: string
    onComplete: (props: CompleteProps) => void
    onError: <TError = Error>(props: ErrorProps<TError>) => void
    routers: Map<[string, string?], RoutersValueType[]>
    source: StreamSourceProps
}

export const processRoutes = ({
    currentPath,
    onComplete,
    onError,
    routers,
    source,
}: ProcessRoutesProps) => {
    const routeEntry = [...routers.entries()].find(
        ([[path, method], callbacks]) => {
            /**
             * If currentPath contains path, check if its a nested route
             * If nestedRoute, return true
             * else check if current path is the exact route for path
             */
            let pathFound = false
            if ((currentPath.indexOf(path) ?? -1) > -1) {
                let nestedRoute = callbacks.some(
                    (callback) => callback instanceof StreamRouter
                )
                if (!nestedRoute) pathFound = currentPath === path
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
        source,
        truncatedPath:
            currentPath.length === path.length
                ? '/'
                : currentPath.substring(path.length),
    })
}
