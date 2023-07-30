import { constants } from 'http2'
import { StreamRouterCallbackProps } from '../../src/helpers'

export const auth = ({ source, next, complete }: StreamRouterCallbackProps) => {
    const authorized = true
    if (authorized) {
        next()
        return
    }
    // is valid
    console.log('user is not authenticated')
    // next(source)
    source.stream.respond({
        [constants.HTTP2_HEADER_CONTENT_TYPE]: 'text/html; charset=utf-8',
        [constants.HTTP2_HEADER_STATUS]: constants.HTTP_STATUS_UNAUTHORIZED,
    })

    complete('Unauthorized')
}
