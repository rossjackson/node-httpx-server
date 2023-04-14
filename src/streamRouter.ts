import {
    MethodType,
    ProcessRoutesProps,
    RoutersValueType,
    processRoutes,
} from './helpers'

class StreamRouter {
    routers: Map<[string, string], RoutersValueType[]>
    constructor() {
        this.routers = new Map<[string, string], RoutersValueType[]>()
    }

    generateRoute =
        (method: MethodType) =>
        (path: string, ...callbacks: RoutersValueType[]) => {
            this.routers.set([path, method], callbacks)
        }

    load = ({
        currentPath,
        onComplete,
        onError,
        source,
    }: Omit<ProcessRoutesProps, 'routers'>) => {
        processRoutes({
            currentPath,
            onComplete,
            onError,
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
