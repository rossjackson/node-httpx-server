import {
    MethodType,
    ProcessRoutesProps,
    StreamRouterCallbackType,
    processRoutes,
} from './helpers'

class StreamRouter {
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
        source,
    }: Omit<ProcessRoutesProps, 'routers'>) => {
        processRoutes({
            currentPath,
            onComplete,
            onError,
            pathParameters,
            routers: this.routers,
            source,
        })
    }

    delete = this.generateRoute('DELETE')
    get = this.generateRoute('GET')
    patch = this.generateRoute('PATCH')
    post = this.generateRoute('POST')
    put = this.generateRoute('PUT')
}

export default StreamRouter
