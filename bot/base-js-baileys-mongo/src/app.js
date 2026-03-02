import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MongoAdapter as Database } from '@builderbot/database-mongo'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

const PORTURL = Number(process.env.BOT_PORT ) || 4001

const discordFlow = addKeyword('doc').addAnswer(
    ['You can see the documentation here', '📄 https://builderbot.app/docs \n', 'Do you want to continue? *yes*'].join(
        '\n'
    ),
    { capture: true },
    async (ctx, { gotoFlow, flowDynamic }) => {
        if (ctx.body.toLocaleLowerCase().includes('yes')) {
            return gotoFlow(registerFlow)
        }
        await flowDynamic('Thanks!')
        return
    }
)

const welcomeFlow = addKeyword(['hi', 'hello', 'hola'])
    .addAnswer(`🙌 Hello welcome to this *Chatbot*`)
    .addAnswer(
        [
            'I share with you the following links of interest about the project',
            '👉 *doc* to view the documentation',
        ].join('\n'),
        { delay: 800, capture: true },
        async (ctx, { fallBack }) => {
            if (!ctx.body.toLocaleLowerCase().includes('doc')) {
                return fallBack('You should type *doc*')
            }
            return
        },
        [discordFlow]
    )

const registerFlow = addKeyword(utils.setEvent('REGISTER_FLOW'))
    .addAnswer(`What is your name?`, { capture: true }, async (ctx, { state }) => {
        await state.update({ name: ctx.body })
    })
    .addAnswer('What is your age?', { capture: true }, async (ctx, { state }) => {
        await state.update({ age: ctx.body })
    })
    .addAction(async (_, { flowDynamic, state }) => {
        await flowDynamic(`${state.get('name')}, thanks for your information!: Your age: ${state.get('age')}`)
    })

const fullSamplesFlow = addKeyword(['samples', utils.setEvent('SAMPLES')])
    .addAnswer(`💪 I'll send you a lot files...`)
    .addAnswer(`Send image from Local`, { media: join(process.cwd(), 'assets', 'sample.png') })
    .addAnswer(`Send video from URL`, {
        media: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJ0ZGdjd2syeXAwMjQ4aWdkcW04OWlqcXI3Ynh1ODkwZ25zZWZ1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCohAb657pSdHv0Q5h/giphy.mp4',
    })
    .addAnswer(`Send audio from URL`, { media: 'https://cdn.freesound.org/previews/728/728142_11861866-lq.mp3' })
    .addAnswer(`Send file from URL`, {
        media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    })

export const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, registerFlow, fullSamplesFlow])
    
    const adapterProvider = createProvider(Provider, 
        { version: [2, 3000, 1027934701] } 
    )

    const adapterDB = new Database({
        dbUri: process.env.CNX_MONGO,
        dbName: 'ODT-SENA',
    })

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    // ✅ Esperamos a que el vendor (Baileys) esté disponible
    await new Promise((resolve) => {
        const interval = setInterval(() => {
            if (adapterProvider.vendor) {
                clearInterval(interval)
                resolve()
            }
        }, 500)
    })

    console.log('✅ Vendor Baileys listo')

    // ✅ Escuchamos el QR directamente desde Baileys
    adapterProvider.vendor.ev.on('connection.update', async (update) => {
        console.log('📡 Connection update:', JSON.stringify(update))
        if (update.qr) {
            const { toFile } = await import('qrcode')
            await toFile(join(process.cwd(), 'bot.qr.png'), update.qr)
            console.log('📸 QR guardado en bot.qr.png')
        }
    })

    // El evento propio del adapter como respaldo
    adapterProvider.on('require_action', async (payload) => {
        console.log('🔔 require_action:', JSON.stringify(payload, null, 2))
        if (payload?.instructions?.qr) {
            const { toFile } = await import('qrcode')
            await toFile(join(process.cwd(), 'bot.qr.png'), payload.instructions.qr)
            console.log('📸 QR generado desde require_action')
        }
    })

    

    httpServer(+PORTURL)
}

//main()
