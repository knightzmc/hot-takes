import {randomInt} from 'crypto'
import {readFileSync} from 'fs'
import './util.js'

type HotTakeThing = string | {
    take: string,
    image: string | string[]
}

function replaceHotTakeThing(f: (arg: string) => string, thing: HotTakeThing): HotTakeThing {
    if (typeof thing === 'string') return f(thing)
    return {
        take: f(thing.take),
        image: thing.image
    }
}

function hotTakeValue(thing: HotTakeThing): string {
    if (typeof thing === 'string') return thing
    return thing.take
}

function hotTakeImages(thing: HotTakeThing): string[] {
    if (typeof thing === 'string') return []
    if (typeof thing.image === 'string') return [thing.image]
    return thing.image
}

const hotTakeData: {
    people: HotTakeThing[],
    companies: HotTakeThing[],
    languages: HotTakeThing[]
    technologies: HotTakeThing[],
    problems: HotTakeThing[],
    tlds: HotTakeThing[]
    takes: HotTakeThing[],
} = JSON.parse(readFileSync(process.cwd() + '/hotTakeData.json').toString())

const placeholders = {
    language: () => hotTakeData.languages,
    technology: () => hotTakeData.technologies,
    tld: () => hotTakeData.tlds,
    thing: combineSources('languages', 'technologies'),
    anything: combineSources('languages', 'technologies', 'people', 'companies'),
    oneWordAnything: (users: string[]) => mapPlaceholder('anything', it => replaceHotTakeThing(s => s.replace(' ', ''), it))(users),
    person: () => hotTakeData.people,
    company: () => hotTakeData.companies,
    group: combineSources('people', 'companies'),
    problem: () => hotTakeData.problems,
    year: () => [randomInt(1500, 2022).toString()] as HotTakeThing[],
    age: () => [randomInt(1, 50).toString()] as HotTakeThing[],
    bigNumber: () => [randomInt(2, 100000).toString()] as HotTakeThing[],
    percentage: () => [randomInt(1, 100).toString()] as HotTakeThing[],
    oneWordThing: (users: string[]) => mapPlaceholder('thing', it => replaceHotTakeThing(s => s.replace(' ', ''), it))(users),
}

type Placeholder = keyof typeof placeholders

function isValidPlaceholder(value: string): value is Placeholder {
    return Object.keys(placeholders).includes(value)
}

type NewOmit<T, K extends PropertyKey> =
    { [P in keyof T as Exclude<P, K>]: T[P] };

function combineSources(...source: (NewOmit<keyof typeof hotTakeData, 'takes'>)[]): (users: string[]) => HotTakeThing[] {
    if (source.length === 0) return () => []
    const head: HotTakeThing[] = hotTakeData[source[0]]
    const tail = source.slice(1).flatMap(it => hotTakeData[it])
    return (users: string[]) => head.concat(tail, users)
}

function mapPlaceholder(key: Placeholder, f: (s: HotTakeThing) => HotTakeThing): (users: string[]) => HotTakeThing[] {
    return (users: string[]) => placeholders[key](users).map(f)
}


type HotTakeResponse = {
    take: string,
    images: string[] // max of 4
}

export default async function generateHotTake(): Promise<HotTakeResponse> {
    const images: string[] = []
    const randomTake = hotTakeData.takes.randomElement()
    const takeImage = hotTakeImages(randomTake)

    const takeValue = hotTakeValue(randomTake)
    const take = takeValue.replace(/{[\w|]+}/g, value => {
            const randomReplacement = value
                .slice(1, -1)// remove the {}
                .split('|') // split into options
                .filter(isValidPlaceholder) // filter out invalid placeholders
                .flatMap(it => {
                    return placeholders[it]([])
                })   // get the values for each placeholder
                .randomElement(); // pick a random value
            const replacementImage = hotTakeImages(randomReplacement)
            if (replacementImage) images.push(...replacementImage)
            return hotTakeValue(randomReplacement)
        }
    )
    if (takeImage) images.push(...takeImage) // add the take image to the end
    return {
        take,
        images: images.slice(0, 4)
    }
}
