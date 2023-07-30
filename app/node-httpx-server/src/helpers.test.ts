import { routerError } from './constants'
import * as Helpers from './helpers'
import { StreamRouter } from './streamRouter'

describe('recurseCallbacks', () => {
    it('calls streamRouter when it is the callback', () => {
        const mockedFn = jest.fn
        let mockedSource: Helpers.StreamSourceProps = {
            flags: 0,
            headers: {},
            stream: {} as any,
        }
        const mockedStreamRouter = new StreamRouter()
        jest.spyOn(mockedStreamRouter, 'process').mockImplementation(mockedFn)

        Helpers.recurseCallbacks({
            callbacks: [mockedStreamRouter],
            onComplete: mockedFn,
            onError: mockedFn,
            source: mockedSource,
            truncatedPath: '/',
        })

        expect(mockedStreamRouter.process).toHaveBeenCalledTimes(1)
    })

    it('calls the callback method', () => {
        let called = 0
        const mockedCallbackFn: Helpers.StreamRouterCallbackType = ({
            next,
        }) => {
            called++
            next()
        }

        let mockedSource: Helpers.StreamSourceProps = {
            flags: 0,
            headers: {},
            stream: {} as any,
        }

        Helpers.recurseCallbacks({
            callbacks: [mockedCallbackFn, mockedCallbackFn],
            onComplete: jest.fn,
            onError: jest.fn,
            source: mockedSource,
            truncatedPath: '/',
        })

        expect(called).toStrictEqual(2)
    })
})

describe('incomingContainsRouterPath', () => {
    it('should return falsy when incomingPathArr is an empty string array', () => {
        const incomingPathArr: string[] = []
        const routerPathArr: string[] = ['users', '{id}']

        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeFalsy()
    })

    it('should return falsy when routerPathArr is an empty string array', () => {
        const incomingPathArr: string[] = ['users', '1234']
        const routerPathArr: string[] = []

        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeFalsy()
    })

    it('should return falsy when routerPathArr value is longer than the incomingPathArr length', () => {
        const incomingPathArr: string[] = ['users']
        const routerPathArr: string[] = ['users', '{id}']
        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeFalsy()
    })

    it('should return truthy when routerPathArr value is the same exact incomingPathArr value', () => {
        const incomingPathArr: string[] = ['users']
        const routerPathArr: string[] = ['users']
        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeTruthy()
    })

    it('should return truthy when incomingPathArr value is longer but contains routerPathArr value', () => {
        const incomingPathArr = ['users', '1234', 'addresses', '4321']
        const routerPathArr = ['users']
        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeTruthy()
    })

    it('should return truthy when routerPathArr value contains pathParameter', () => {
        const incomingPathArr = ['users', '1234', 'addresses', '4321']
        let routerPathArr = ['users', '{userId}']
        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeTruthy()

        routerPathArr = ['users', '{userId}', 'addresses', '{addressId}']
        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeTruthy()
    })

    it('should return falsy when incomingPath value does not contain routerPath value', () => {
        const incomingPathArr = ['users', '1234', 'addresses', '4321']
        let routerPathArr = ['companies']
        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeFalsy()

        routerPathArr = ['companies', '{companyId}']
        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeFalsy()

        routerPathArr = ['users', '{userId}', 'friends']
        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeFalsy()

        routerPathArr = ['users', '{userId}', 'friends', '{friendId}']
        expect(
            Helpers.incomingContainsRouterPath({
                incomingPathArr,
                routerPathArr,
            })
        ).toBeFalsy()
    })
})

describe('getPathParameters', () => {
    it('should return an empty path parameters when there is no {} path parameter found', () => {
        const incomingPathArr = ['users', '1234']
        const routePathArr = ['users']

        const expected = Helpers.getPathParameters({
            incomingPathArr,
            routePathArr,
        })

        expect(expected).toBeTruthy()
        expect(expected).toStrictEqual({})
    })

    it('should return an empty path when the route parameter is malformed', () => {
        const incomingPathArr = ['users', '1234']
        let routePathArr = ['users']

        let expected = Helpers.getPathParameters({
            incomingPathArr,
            routePathArr,
        })

        expect(expected).toBeTruthy()
        expect(expected).toStrictEqual({})

        routePathArr = ['users', '{userId']
        expected = Helpers.getPathParameters({
            incomingPathArr,
            routePathArr,
        })

        expect(expected).toStrictEqual({})

        routePathArr = ['users', 'userId}']
        expected = Helpers.getPathParameters({
            incomingPathArr,
            routePathArr,
        })

        expect(expected).toStrictEqual({})

        routePathArr = ['users', 'u{serId}']
        expected = Helpers.getPathParameters({
            incomingPathArr,
            routePathArr,
        })

        expect(expected).toStrictEqual({})
    })

    it('should return correct path parameters when found', () => {
        let incomingPathArr = ['users', '1234']
        let routePathArr = ['users', '{userId}']

        let expected = Helpers.getPathParameters({
            incomingPathArr,
            routePathArr,
        })

        expect(expected).toStrictEqual({
            userId: '1234',
        })

        incomingPathArr = ['users', '1234', 'address', '4321', 'author', '8744']
        routePathArr = ['users', '{userId}', 'address', '{addressId}']

        expected = Helpers.getPathParameters({
            incomingPathArr,
            routePathArr,
        })

        expect(expected).toStrictEqual({
            userId: '1234',
            addressId: '4321',
        })
    })
})

describe('getRouteEntry', () => {
    let sampleRouters: Map<Helpers.RouterKeyType, Helpers.RoutersValueType[]>
    const mockedStreamRouterCallback: Helpers.StreamRouterCallbackType =
        jest.fn()
    let mockedStreamSource: jest.Mocked<Helpers.StreamSourceProps>

    beforeEach(() => {
        sampleRouters = new Map<
            Helpers.RouterKeyType,
            Helpers.RoutersValueType[]
        >()
    })
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should return undefined when either incomingPathArr is empty or path are undefined', () => {
        let expected = Helpers.getRouteEntry({
            incomingPathArr: [],
            routersArray: [...sampleRouters],
            source: {
                ...mockedStreamSource,
                headers: {
                    ':method': 'GET',
                },
            },
        })
        expect(expected).toBeUndefined()

        sampleRouters.set([''], [mockedStreamRouterCallback])

        expected = Helpers.getRouteEntry({
            incomingPathArr: ['users'],
            routersArray: [...sampleRouters],
            source: {
                ...mockedStreamSource,
                headers: {
                    ':method': 'GET',
                },
            },
        })
        expect(expected).toBeUndefined()
    })

    it('should return undefined when path is malformed', () => {
        sampleRouters.set(['users'], [mockedStreamRouterCallback])

        const expected = Helpers.getRouteEntry({
            incomingPathArr: ['users'],
            routersArray: [...sampleRouters],
            source: {
                ...mockedStreamSource,
                headers: {
                    ':method': 'GET',
                },
            },
        })
        expect(expected).toBeUndefined()
    })

    it('should return undefined when incomingContainsRouterPath is not found', () => {
        jest.spyOn(Helpers, 'incomingContainsRouterPath').mockReturnValue(false)
        const expected = Helpers.getRouteEntry({
            incomingPathArr: ['non-existent'],
            routersArray: [...sampleRouters],
            source: {
                ...mockedStreamSource,
                headers: {
                    ':method': 'GET',
                },
            },
        })

        expect(Helpers.incomingContainsRouterPath).toHaveBeenCalledTimes(
            sampleRouters.size
        )
        expect(expected).toBeUndefined()
    })

    it('should return truthy when router path is found and method is undefined', () => {
        sampleRouters.set(['/parent-users'], [mockedStreamRouterCallback])
        jest.spyOn(Helpers, 'incomingContainsRouterPath').mockReturnValue(true)
        const actualRouterKey: Helpers.RouterKeyType = ['/parent-users']
        const expected = Helpers.getRouteEntry({
            incomingPathArr: actualRouterKey[0].split('/').splice(1),
            routersArray: [...sampleRouters],
            source: {
                ...mockedStreamSource,
                headers: {
                    ':method': 'GET',
                },
            },
        })

        expect(Helpers.incomingContainsRouterPath).toHaveBeenCalled()
        expect(expected).not.toBeUndefined()
        expect(expected![0]).toStrictEqual(actualRouterKey)
    })

    it('should return truthy when router path is found and method is matched', () => {
        sampleRouters.set(['/users/{id}', 'GET'], [mockedStreamRouterCallback])
        jest.spyOn(Helpers, 'incomingContainsRouterPath').mockReturnValue(true)
        const actualRouterKey: Helpers.RouterKeyType = ['/users/{id}', 'GET']
        const expected = Helpers.getRouteEntry({
            incomingPathArr: actualRouterKey[0].split('/').splice(1),
            routersArray: [...sampleRouters],
            source: {
                ...mockedStreamSource,
                headers: {
                    ':method': 'GET',
                },
            },
        })

        expect(Helpers.incomingContainsRouterPath).toHaveBeenCalled()
        expect(expected).not.toBeUndefined()
        expect(expected![0]).toStrictEqual(actualRouterKey)
    })

    it('should return undefined when router path is found and method does not match', () => {
        sampleRouters.set(['/users/{id}', 'GET'], [mockedStreamRouterCallback])
        jest.spyOn(Helpers, 'incomingContainsRouterPath').mockReturnValue(true)
        const actualRouterKey: Helpers.RouterKeyType = ['/users/{id}', 'GET']
        const expected = Helpers.getRouteEntry({
            incomingPathArr: actualRouterKey[0].split('/').splice(1),
            routersArray: [...sampleRouters],
            source: {
                ...mockedStreamSource,
                headers: {
                    ':method': 'POST',
                },
            },
        })

        expect(Helpers.incomingContainsRouterPath).toHaveBeenCalled()
        expect(expected).toBeUndefined()
    })
})

describe('processRoutes', () => {
    let mockedSource: Helpers.StreamSourceProps = {
        flags: 0,
        headers: {},
        stream: {} as any,
    }
    it('should call onError when it does not have a currentPath', () => {
        let onErrorCalled = false
        jest.spyOn(console, 'error').mockReturnValue()
        Helpers.processRoutes({
            currentPath: '',
            onComplete: jest.fn,
            onError: () => {
                onErrorCalled = true
            },
            routers: new Map(),
            source: mockedSource,
        })

        expect(onErrorCalled).toBeTruthy()
    })

    it('should call onError when currentPath is missing a forward slash', () => {
        let onErrorCalled = false
        jest.spyOn(console, 'error').mockReturnValue()
        Helpers.processRoutes({
            currentPath: 'users',
            onComplete: jest.fn,
            onError: () => {
                onErrorCalled = true
            },
            routers: new Map(),
            source: mockedSource,
        })

        expect(onErrorCalled).toBeTruthy()
    })

    it('should call onError with Not found message when route is not found', () => {
        let onErrorCalled = false
        let actualError: Error | undefined = undefined

        const expectedErrorMessage = 'Not found'

        jest.spyOn(Helpers, 'getRouteEntry').mockReturnValue(undefined)
        Helpers.processRoutes({
            currentPath: '/users',
            onComplete: jest.fn,
            onError: ({ error }) => {
                onErrorCalled = true
                actualError = error
            },
            routers: new Map(),
            source: mockedSource,
        })

        expect(onErrorCalled).toBeTruthy()
        expect(actualError).toBeTruthy()
        expect(actualError!.message).toStrictEqual(expectedErrorMessage)
        expect(actualError!.name).toStrictEqual(routerError.NOT_FOUND)
    })

    it('should process routes successfully by iterating through the callbacks', () => {
        jest.spyOn(Helpers, 'getRouteEntry').mockReturnValue([
            ['users'],
            [jest.fn],
        ])
        jest.spyOn(Helpers, 'getPathParameters').mockReturnValue({})
        jest.spyOn(Helpers, 'recurseCallbacks').mockReturnValue()
        Helpers.processRoutes({
            currentPath: '/users',
            onComplete: jest.fn,
            onError: jest.fn,
            routers: new Map(),
            source: mockedSource,
        })

        expect(Helpers.recurseCallbacks).toHaveBeenCalled()
    })

    it('should properly add search parameters when found in currentPath', () => {
        jest.spyOn(Helpers, 'getRouteEntry').mockReturnValue([
            ['users'],
            [jest.fn],
        ])
        jest.spyOn(Helpers, 'getPathParameters').mockReturnValue({})
        let actualSearchParams: URLSearchParams | undefined = undefined
        jest.spyOn(Helpers, 'recurseCallbacks').mockImplementation(
            ({ searchParams }) => {
                actualSearchParams = searchParams
            }
        )

        Helpers.processRoutes({
            currentPath: '/users?userId=1234',
            onComplete: jest.fn,
            onError: jest.fn,
            routers: new Map(),
            source: mockedSource,
        })

        expect(Helpers.recurseCallbacks).toHaveBeenCalled()
        expect(actualSearchParams).toBeTruthy()
        expect(actualSearchParams!.get('userId')).toStrictEqual('1234')
    })
})
