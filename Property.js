/*
 Execute the script to capture a screenshot of each page including all properties
 @author:guimalfatti76@gmail.com
*/

const puppeteer = require('puppeteer');
const delay = require('delay');
const urls = require('./urls.json');
var fs = require('fs');
var dir = './photos';


module.exports = class Property {
    page

    constructor() { 
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
    }

    async fetch(state, city, isHeadless, valueRange) {
        try {
            const browser = await puppeteer.launch({ headless: isHeadless });

            this.page = await browser.newPage();

            await this.page.goto(urls.paginaBuscaImoveis);
            await this.setupAndFetchProperties(state, city, valueRange)

            await browser.close();
        } catch (error) {
            console.error(error)
        }
    }

    async setupAndFetchProperties(uf, cidade, valueRange) {
        try {
            let carregamentoBairros = await this.selectStates(uf);
            if (!carregamentoBairros) {
                console.error(`state ${uf} does not exist`)
                return []
            }

            await this.waitRequestResponse(urls.carregaListaCidades)

            let carregamentoCidades = await this.selectCity(cidade);
            if (!carregamentoCidades) {
                console.error(`city ${cidade} does not exist`)
                return []
            }
            await this.waitRequestResponse(urls.carregaListaBairros)

            console.log(`Step 1(Opções) done, waiting to load next step`)
            this.page.click("#btn_next0")


            await delay(30)

            console.log(`Step 2(Dados Imóvel) done, waiting to load next step`)
            await this.selectValueRange(valueRange)
            await this.takeScreenShotWithDelayDefault("a_prove")
            await this.clickAndWait(urls.carregaListaImoveis, "#btn_next1")



            console.log(`Start fetching pagination results`)
            let imoveis = await this.fetchProperties(uf, cidade)

            return imoveis
        } catch (err) {
            console.error(err, "error:")
        }
    }

    async clickAndWait(url, identifier) {
        this.page.click(identifier)
        await this.page.waitForResponse(response => {
            return response.url() === url;
        }, { timeout: 60000 });

        console.log(`Done!`)
    }

    async waitRequestResponse(url) {
        return new Promise((resolve, reject) => {
            this.page.on('response', function logRequest(interceptedRequest) {
                if (interceptedRequest.url() == url) {
                    if (interceptedRequest.status() == 200)
                        resolve(true)
                    else
                        reject(interceptedRequest.status())
                }
            });
        })
    }

    async selectStates(uf) {
        console.log(`State: ${uf}`)
        return await this.page.evaluate((uf) => {
            if ($(`#cmb_estado option[value='${uf}']`).length == 0)
                return false
            $(`#cmb_estado`).val(`${uf}`);
            selecionaEstado();
            return true
        }, uf);
    }

    async selectCity(cidade) {
        console.log(`City: ${cidade}`)
        return await this.page.evaluate((cidade) => {
            if ($(`#cmb_cidade option:contains('${cidade}')`).length == 0)
                return false
            $(`#cmb_cidade`).val($(`#cmb_cidade option:contains('${cidade}')`).val());
            carregaListaBairros()
            return true
        }, cidade);
    }

    /*
      1 - Até R$100.000,00
      2 - De R$100.000,01 até R$200.000,00
      3 - De R$200.000,01 até R$400.000,004
      4 - De R$400.000,01 até R$750.000,00
      5 Acima de R$750.000,00
    */
      async selectValueRange(range) {
        console.log(`Value range: ${range}`)
        this.page.select('#cmb_faixa_vlr', range)
    }

    async fetchProperties(uf, cidade) {
        // screenshot of the first page
        await this.takeScreenShotWithDelay(1, uf, cidade);

        let pagination = await this.page.$$(`#paginacao a`)
        for (let i = 2; i <= pagination.length; i++) {
            this.page.click(`#paginacao a:nth-child(${i})`)
            await this.page.waitForResponse(response => {
                return response.url() === urls.carregaListaImoveis;
            });

            await this.takeScreenShotWithDelay(i, uf, cidade);
        }

    }

    async takeScreenShotWithDelay(index, uf, cidade) {
        await delay(1000);
        await this.page.screenshot({ path: `./photos/${uf}_${cidade}_page_${index}.png`, fullPage: true });
        console.log(`ScreenShot of page ${index} done.`)
    }

    async takeScreenShotWithDelayDefault(fileName) {
        await delay(1000);
        await this.page.screenshot({ path: `./photos/${fileName}.png`, fullPage: true });
        console.log(`ScreenShot of page done.`)
    }
}