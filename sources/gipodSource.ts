import { Source, Page } from '@treecg/basic-ldes-server';
import type * as RDF from 'rdf-js';
import { literal, namedNode, blankNode, quad } from '@rdfjs/data-model';
import { Readable } from 'stream';

export class mySource extends Source {

    protected config: object;

    constructor(config: object) {
        super(config);
    }

    /*
     * Not exectly clear what a 'page' is in this context.
     */
    async getPage(id: any): Promise<Page> {
        let triples: RDF.Quad[] = [];
        let metadata: RDF.Quad[] = [];

        let apiURL = "http://api.gipod.vlaanderen.be/ws/v1/Manifestation?city=" + this.config["city"];

        let gipodApiResponse = await fetch(apiURL)
            .then(res => res.json())

        let reducedSet = this.cleanApiResult(gipodApiResponse)
        Object.keys(reducedSet).forEach(gipodId => {
            triples = triples.concat(this.mapGipodEvent(reducedSet[gipodId]));
        });

        return new Page(triples, metadata);
    }

    /*
     * API is structure so that each instance of a period is reflected. Keeping only one, as this is PoC.
     * Should be fetching the detail pages, and include the period instead.
     */
    cleanApiResult(gipodApiResponse) {
        let reducedSet = {};
        gipodApiResponse.forEach(gipodEvent => {
            reducedSet[gipodEvent['gipodId']] = gipodEvent;
        });
        return reducedSet;
    }

    /*
     * Map the GIPOD WS structure to the OSLO application profile.
     * See https://data.vlaanderen.be/doc/applicatieprofiel/inname-openbaar-domein/#Inname
     */
    mapGipodEvent(gipodEvent: object): RDF.Quad[] {
        let triples: RDF.Quad[] = [];
        triples.push(quad(namedNode(gipodEvent["detail"]), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('https://data.vlaanderen.be/ns/mobiliteit#Inname')));
        triples.push(quad(namedNode(gipodEvent["detail"]), namedNode('http://purl.org/dc/terms/description'), literal(gipodEvent['description'].replace(/^\s+|\s+$/g, ""))));
        let eventSchedule = blankNode();
        triples.push(quad(namedNode(gipodEvent["detail"]), namedNode('http://schema.org/eventSchedule'), eventSchedule));
        triples.push(quad(eventSchedule, namedNode('https://schema.org/startTime'), literal(gipodEvent['startDateTime'])));
        triples.push(quad(eventSchedule, namedNode('https://schema.org/endTime'), literal(gipodEvent['endDateTime'])));
        return triples;
    }

}
