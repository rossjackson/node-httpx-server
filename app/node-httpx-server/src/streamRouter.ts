import {
    MethodType,
    ProcessRoutesProps,
    StreamRouterCallbackType,
    processRoutes,
} from './helpers'

export class StreamRouter {
    routers: Map<[string, string], StreamRouterCallbackType[]>
    constructor() {
        this.routers = new Map<[string, string], StreamRouterCallbackType[]>()
    }

    generateRoute =
        (method: MethodType) =>
        (path: string, ...callbacks: StreamRouterCallbackType[]) => {
            this.routers.set([path, method], callbacks)
        }

    process = ({
        currentPath,
        onComplete,
        onError,
        pathParameters,
        searchParams,
        source,
    }: Omit<ProcessRoutesProps, 'routers'>) => {
        processRoutes({
            currentPath,
            onComplete,
            onError,
            pathParameters,
            routers: this.routers,
            searchParams,
            source,
        })
    }

    delete = this.generateRoute('DELETE')
    get = this.generateRoute('GET')
    patch = this.generateRoute('PATCH')
    post = this.generateRoute('POST')
    put = this.generateRoute('PUT')
}
