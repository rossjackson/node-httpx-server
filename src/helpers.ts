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
    pathParameters?: PathParametersType
    searchParams?: URLSearchParams
    source: StreamSourceProps
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
    searchParams?: URLSearchParams
    source: StreamSourceProps
    truncatedPath: string
}

export const recurseCallbacks = ({
    callbacks,
    onComplete,
    onError,
    pathParameters,
    searchParams,
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
                searchParams,
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
            searchParams,
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
            searchParams,
            source,
        })
        return
    }

    callback({
        complete: handleComplete,
        error: handleError,
        next: handleNext,
        pathParameters,
        searchParams,
        source,
    })
}

export interface IncomingContainsRouterPathProps {
    incomingPathArr: string[]
    routerPathArr: string[]
}

export const incomingContainsRouterPath = ({
    incomingPathArr,
    routerPathArr,
}: IncomingContainsRouterPathProps): boolean => {
    if (!incomingPathArr.length || !routerPathArr.length) return false

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

export interface GetPathParametersProps {
    incomingPathArr: string[]
    routePathArr: string[]
}

export const getPathParameters = ({
    incomingPathArr,
    routePathArr,
}: GetPathParametersProps): PathParametersType => {
    let pathParameter: PathParametersType = {}
    routePathArr.forEach((routePath, idx) => {
        if (!routePath.startsWith('{') || !routePath.endsWith('}')) return
        pathParameter[routePath.substring(1, routePath.length - 1)] =
            incomingPathArr[idx]
    })
    return pathParameter
}

export type RouterKeyType = [string, string?]

export interface ProcessRoutesProps {
    currentPath: string
    onComplete: (props: CompleteProps) => void
    onError: <TError extends Error>(props: ErrorProps<TError>) => void
    pathParameters?: PathParametersType
    routers: Map<RouterKeyType, RoutersValueType[]>
    searchParams?: URLSearchParams
    source: StreamSourceProps
}

export interface GetRouteEntryProps {
    incomingPathArr: string[]
    routersArray: [RouterKeyType, RoutersValueType[]][]
    source: StreamSourceProps
}

export const getRouteEntry = ({
    incomingPathArr,
    routersArray,
    source,
}: GetRouteEntryProps): [RouterKeyType, RoutersValueType[]] | undefined => {
    const routeEntry = routersArray.find(([[path, method]]) => {
        if (!incomingPathArr.length || !path || path.indexOf('/') === -1)
            return false

        const routerPathArr = path.split('/').slice(1)

        const routerPathFound = incomingContainsRouterPath({
            incomingPathArr,
            routerPathArr,
        })

        return (
            routerPathFound &&
            (!method ||
                source.headers[constants.HTTP2_HEADER_METHOD] === method)
        )
    })

    return routeEntry
}

export const processRoutes = ({
    currentPath,
    onComplete,
    onError,
    pathParameters,
    routers,
    searchParams,
    source,
}: ProcessRoutesProps) => {
    if (!currentPath || currentPath.indexOf('/') === -1) {
        const serverError = new Error('Server error')
        serverError.name = routerError.SERVER_ERROR
        console.error(
            'Malformed currentPath.  Must include current path with /'
        )
        onError({
            error: serverError,
            stream: source.stream,
        })
        return
    }

    if (currentPath.indexOf('?') > -1) {
        const searchSplitArr = currentPath.split('?')
        currentPath = searchSplitArr[0]
        searchParams = new URLSearchParams(searchSplitArr[1])
    }

    const incomingPathArr = currentPath.split('/').slice(1)

    const routeEntry = getRouteEntry({
        incomingPathArr,
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
    const routePathArr = path.split('/').slice(1)

    pathParameters = {
        ...pathParameters,
        ...getPathParameters({
            incomingPathArr,
            routePathArr,
        }),
    }

    const newCurrentPathArr = incomingPathArr.slice(routePathArr.length)
    const truncatedPath = `/${newCurrentPathArr.join('/')}`

    recurseCallbacks({
        callbacks,
        onComplete,
        onError,
        pathParameters,
        searchParams,
        source,
        truncatedPath,
    })
}
