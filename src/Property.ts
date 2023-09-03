/*
 Execute the script to capture a screenshot of each page including all properties
 @author:guimalfatti76@gmail.com
*/
import * as puppeteer from "puppeteer";
const delay = require('delay');
import * as urls from './urls.json';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from "path"

let root_dir: string = "./photos"; 


export class Property {
    page: puppeteer.Page = new puppeteer.Page;
    state: string
    city: string
    valueRange: string
    fullDir: string

    constructor(state: string, city: string, valueRange: string) { 
        this.state = state
        this.city = city
        this.valueRange = valueRange

        this.fullDir = `${root_dir}/${city.replace(" ", "_")}/range_${valueRange}`
        if (!fs.existsSync(this.fullDir)){
            fs.mkdirSync(this.fullDir, { recursive: true });
            console.log(`folder created ${this.fullDir}`)
        }

        this.deleteAllFilesInDir(this.fullDir).then(() => {
            console.log('Removed all files from the specified directory');
        });
    
    }

    async deleteAllFilesInDir(dirPath: string) {
        try {
          const files = await fsp.readdir(dirPath);
      
          const deleteFilePromises = files.map(file =>
            fsp.unlink(path.join(dirPath, file)),
          );
      
          await Promise.all(deleteFilePromises);
        } catch (err) {
          console.log(err);
        }
      }
      
      
    async fetch() {
        try {
            const browser = await puppeteer.launch({ headless: true });

            this.page = await browser.newPage();
            await this.page.setViewport({ width: 1866, height: 768});
            this.page.setDefaultTimeout(0)

            await this.page.goto(urls.paginaBuscaImoveis);
            await this.setupAndFetchProperties(this.state, this.city, this.valueRange)

            await browser.close();
        } catch (error) {
            console.error(error)
        }
    }

    async setupAndFetchProperties(uf: string, cidade: string, valueRange: string) {
        try {
            await this.selectState(uf);

            await this.waitRequestResponse(urls.carregaListaCidades)

            await this.selectCity(cidade);
            
            await this.waitRequestResponse(urls.carregaListaBairros)

            console.log(`Step 1(Opções) done, waiting to load next step`)
            this.page.click("#btn_next0")


            await delay(30)

            console.log(`Step 2(Dados Imóvel) done, waiting to load next step`)
            await this.selectValueRange(valueRange)
            //await this.takeScreenShotFullPage("a_prove")
            await this.clickAndWait(urls.carregaListaImoveis, "#btn_next1")

            // at this point page 1 is loaded
            console.log(`Start fetching pagination results`)
            let imoveis = await this.fetchProperties(uf, cidade)

            return imoveis
        } catch (err) {
            console.error(err)
        }
    }

    async clickAndWait(url: string, identifier: string) {
        this.page.click(identifier)
        await this.page.waitForResponse(response => {
            return response.url() === url;
        }, { timeout: 100000 });
        await this.page.waitForNetworkIdle({ idleTime: 250 })
    }

    async waitRequestResponse(url: string) {
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

    async selectState(uf: string) {
        console.log(`State: ${uf}`)
        await this.page.evaluate(`
            $("#cmb_estado").val('${uf}');
            selecionaEstado();`);
    }

    async selectCity(cidade: string) {
        console.log(`City: ${cidade}`)

        return await this.page.evaluate(`
            let city = $("#cmb_cidade option:contains('${cidade}')").val()
            $('#cmb_cidade').val(city);
            carregaListaBairros();`);
    }

    /*
      1 - Até R$100.000,00
      2 - De R$100.000,01 até R$200.000,00
      3 - De R$200.000,01 até R$400.000,004
      4 - De R$400.000,01 até R$750.000,00
      5 Acima de R$750.000,00
    */
    async selectValueRange(range: string) {
        console.log(`Value range: ${range}`)
        this.page.select('#cmb_faixa_vlr', range)
    }

    //todo make it a class proeprty
    async fetchProperties(uf: string, cidade: string) {
        // screenshot of the first page
        await this.takeScreenShotFullPage(`${uf}_${cidade}_page_1`);

        await this.fetchPropertiesDetail(uf, cidade, 1)

        // interact on all pages
        let pagination = await this.page.$$(`#paginacao a`)
        const secondPage = 2
        for (let i = secondPage; i <= pagination.length; i++) {
            this.page.click(`#paginacao a:nth-child(${i})`)

            await this.page.waitForResponse(response => {
                return response.url() === urls.carregaListaImoveis;
            });

            await this.takeScreenShotFullPage(`${uf}_${cidade}_page_${i}`);
            await this.fetchPropertiesDetail(uf, cidade, i)            
        }

    }

    async fetchPropertiesDetail(uf: string, cidade: string, page: number){
        let propertiesIds = await this.getPropertiesIds(page)

        if(propertiesIds == null){
            console.error("no properties IDs found.")
            return;
        }
        
        console.log(`Properties count: ${propertiesIds.length}`)
        for (let i = 0; i < propertiesIds.length; i++) {
            await this.goToDetails(parseInt(propertiesIds[i]))
            await this.takeScreenShot(`property_${page}_${i}_${parseInt(propertiesIds[i])}`)
            await this.returnToPropertyList()
        }
    }

    async getPropertiesIds(page: number){
        let val =  await await this.page.$eval(`#hdnImov${page}`, element=> element.getAttribute("value"))
        return val?.split("||")
    }

    async goToDetails(propertyId: number){
        await this.page.evaluate(`detalhe_imovel(${propertyId})`)
        
        await this.page.waitForResponse(response => {
            return response.url() === urls.detalheImovel;
        }, {timeout: 0});
    }

    async returnToPropertyList(){
        await this.page.evaluate('Retornar()')
        
        await this.page.waitForResponse(response => {
            return response.url() === urls.carregaListaImoveis;
        }, {timeout: 0});
    }

    async takeScreenShotFullPage(fileName: string) {
        await delay(500);
        await this.page.screenshot({ path: `${this.fullDir}/${fileName}.png`, fullPage: true });
        console.log(`ScreenShot of page ${fileName}.`)
    }

    async takeScreenShot(fileName: string) {
        await delay(500);
        await this.page.screenshot({ path: `${this.fullDir}/${fileName}.png`});
        console.log(`${this.fullDir}/${fileName}.png`)
    }
}