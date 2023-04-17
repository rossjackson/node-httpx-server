import * as Helpers from './helpers'

describe('incomingContainsRouterPath', () => {
    it('should return falsy when incomingPath is an empty string', () => {
        const incomingPath = ''
        const routerPath = '/user/{id}'

        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeFalsy()
    })

    it('should return falsy when routerPath is an empty string', () => {
        const incomingPath = '/user'
        const routerPath = ''

        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeFalsy()
    })

    it('should return falsy when routerPath value is longer than the incomingPath value', () => {
        const incomingPath = '/user'
        const routerPath = '/user/{id}'
        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeFalsy()
    })

    it('should return truthy when routerPath value is the same exact incomingPath value', () => {
        const incomingPath = '/user'
        const routerPath = '/user'
        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeTruthy()
    })

    it('should return truthy when incomingPath value is longer but contains routerPath value', () => {
        const incomingPath = '/user/1234/addresses/4321'
        const routerPath = '/user'
        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeTruthy()
    })

    it('should return truthy when routerPath value contains pathParameter', () => {
        const incomingPath = '/user/1234/addresses/4321'
        let routerPath = '/user/{userId}'
        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeTruthy()

        routerPath = '/user/{userId}/addresses/{addressId}'
        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeTruthy()
    })

    it('should return falsy when incomingPath value does not contain routerPath value', () => {
        let incomingPath = '/user/1234/addresses/4321'
        let routerPath = '/companies'
        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeFalsy()

        routerPath = '/companies/{companyId}'
        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeFalsy()

        routerPath = '/user/{userId}/friends'
        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeFalsy()

        routerPath = '/user/{userId}/friends/{friendId}'
        expect(
            Helpers.incomingContainsRouterPath({ incomingPath, routerPath })
        ).toBeFalsy()
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

    it('should return undefined when incomingContainsRouterPath is not found', () => {
        jest.spyOn(Helpers, 'incomingContainsRouterPath').mockReturnValue(false)
        const expected = Helpers.getRouteEntry({
            currentPath: '/non-existent',
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
            currentPath: actualRouterKey[0],
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
            currentPath: actualRouterKey[0],
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
            currentPath: actualRouterKey[0],
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
