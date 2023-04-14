import { IncomingHttpHeaders, ServerHttp2Stream, constants } from 'http2'
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
            callback.load({
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
        callback.load({
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
    for (const [[path, method], callbacks] of routers.entries()) {
        if ((currentPath.indexOf(path) ?? -1) === -1) {
            continue
        }

        if (
            !!method &&
            source.headers[constants.HTTP2_HEADER_METHOD] !== method
        )
            continue

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
        break
    }
}
