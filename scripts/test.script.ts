import { setTimeout as sleep } from 'timers/promises'

const script = (_name: string, fn: () => unknown) => {
	return fn()
}

script('abc', async () => {
	await sleep(10000)
	console.log('Hello, World!');
})