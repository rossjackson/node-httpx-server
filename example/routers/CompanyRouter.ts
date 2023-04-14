import StreamRouter from '../../src/streamRouter'

const companiesRouter = new StreamRouter()

companiesRouter.get('/{id}', async ({ source, complete }) => {
    const { stream } = source
    stream.write('inside company router', () => {
        complete()
    })
})

export default companiesRouter
