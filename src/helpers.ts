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

export interface IncomingContainsRouterPathProps {
    incomingPath: string
    routerPath: string
}

export const incomingContainsRouterPath = ({
    incomingPath,
    routerPath,
}: IncomingContainsRouterPathProps): boolean => {
    if (!incomingPath || !routerPath) return false

    const incomingPathArr = incomingPath.split('/').slice(1)
    const routerPathArr = routerPath.split('/').slice(1)

    if (
        incomingPathArr.length !== routerPathArr.length &&
        routerPathArr.length > incomingPathArr.length
    )
        return false

    return routerPathArr.every(
        (currentRouterPathValue, idx) =>
            (currentRouterPathValue.startsWith('{') &&
                currentRouterPathValue.endsWith('}')) ||
            incomingPathArr[idx] === currentRouterPathValue
    )
}

export type RouterKeyType = [string, string?]

export interface ProcessRoutesProps {
    currentPath: string
    onComplete: (props: CompleteProps) => void
    onError: <TError extends Error>(props: ErrorProps<TError>) => void
    pathParameters?: PathParametersType
    routers: Map<RouterKeyType, RoutersValueType[]>
    source: StreamSourceProps
}

export interface GetRouteEntryProps {
    currentPath: string
    routersArray: [RouterKeyType, RoutersValueType[]][]
    source: StreamSourceProps
}

export const getRouteEntry = ({
    currentPath,
    routersArray,
    source,
}: GetRouteEntryProps): [RouterKeyType, RoutersValueType[]] | undefined => {
    return routersArray.find(([[path, method]]) => {
        const routerPathFound = incomingContainsRouterPath({
            incomingPath: currentPath,
            routerPath: path,
        })
        return (
            routerPathFound &&
            (!method ||
                source.headers[constants.HTTP2_HEADER_METHOD] === method)
        )
    })
}

export const processRoutes = ({
    currentPath,
    onComplete,
    onError,
    pathParameters,
    routers,
    source,
}: ProcessRoutesProps) => {
    const routeEntry = getRouteEntry({
        currentPath,
        routersArray: [...routers.entries()],
        source,
    })

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
