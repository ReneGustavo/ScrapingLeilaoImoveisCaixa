const puppeteer = require('puppeteer');
const delay = require('delay');

module.exports = class ConsultaImoveis {
    page

    constructor() { }

    async consultar(states) {
        console.log("{ consultar }", states)

        const browser = await puppeteer.launch({ headless: true });

        this.page = await browser.newPage();
        await this.page.goto('https://venda-imoveis.caixa.gov.br/sistema/busca-imovel.asp?sltTipoBusca=imoveis');

        let estados = []

        states.forEach(state => {
            let estado = {
                uf: state[0],
                cidades: []
            }

            state[1].forEach(city => {
                console.log(city)
                estado.cidades.push({
                    nome: city,
                    imoveis: []
                })
            })

            estados.push(estado)
        })

        for (let estado of estados) {
            for (let cidade of estado.cidades) {
                cidade.imoveis = await this.capturarImoveisCidade(estado.uf, cidade.nome)
            }
        }

        await browser.close();

        return estados
    }

    async capturarImoveisCidade(uf, cidade) {
        let carregamentoBairros = await this.selecionarEstado(uf);
        if (!carregamentoBairros) {
            console.log(`ESTADO ${uf} INEXISTENTE`)
            return false
        }
        await delay(2000);

        let carregamentoCidades = await this.selecionarCidade(cidade);
        if (!carregamentoCidades) {
            console.log(`CIDADE ${cidade} INEXISTENTE`)
            return false
        }
        await delay(2000);

        await this.marcarBairros();
        await delay(2000);

        await this.page.evaluate(() => { $("#btn_next0").click() });

        await this.page.evaluate(() => {
            $(`#cmb_tp_imovel`).val($("#cmb_tp_imovel option:contains('Indiferente')").val());
            $(`#cmb_quartos`).val($("#cmb_quartos option:contains('Indiferente')").val());
            $(`#cmb_vg_garagem`).val($("#cmb_vg_garagem option:contains('Indiferente')").val());
            $(`#cmb_vg_garagem`).val($("#cmb_vg_garagem option:contains('Indiferente')").val());
            $(`#cmb_faixa_vlr`).val($("#cmb_faixa_vlr option:contains('Indiferente')").val());
        });

        await this.page.evaluate(() => { $("#btn_next1").click() });

        await delay(3000)

        let imoveis = await this.capturarImoveis()

        //console.log(`IMOVEIS ${uf} ${cidade}`, imoveis)

        return imoveis
    }

    async selecionarEstado(uf) {
        console.log("{ selecionarEstado }", uf)
        return await this.page.evaluate((uf) => {
            if ($(`#cmb_estado option[value='${uf}']`).length == 0)
                return false
            $(`#cmb_estado`).val(`${uf}`);
            selecionaEstado();
            return true
        }, uf);
    }

    async selecionarCidade(cidade) {
        console.log("{ selecionarCidade }", cidade)
        return await this.page.evaluate((cidade) => {
            if ($(`#cmb_cidade option:contains('${cidade}')`).length == 0)
                return false
            $(`#cmb_cidade`).val($(`#cmb_cidade option:contains('${cidade}')`).val());
            carregaListaBairros()
            return true
        }, cidade);
    }

    async marcarBairros() {
        let marcacoes = await this.page.evaluate(() => {
            $(`#listabairros input`).attr("checked", "checked");
            return $(`#listabairros input`).length
        });
        console.log("{ marcarBairros }", `${marcacoes} marcados`)
    }

    async capturarImoveis() {
        return await this.page.evaluate(() => {
            const retorno = []
            const imoveis = $(`#listaimoveispaginacao .group-block-item`)
            for (let i = 0; i < imoveis.length; i++) {
                try {
                    const imovel = imoveis[i]
                    const info = $(imovel).find(`.dadosimovel-col2 span`)

                    var index = 0
                    const bairro = $($(info)[index]).text()
                    index = 1
                    const valores = $(info)[index] ? $($(info)[1]).text() : ""
                    index = 2
                    const restante = $($($(info)[index]).find("font")).html().split("<br>")
                    const detalhes = restante[0]
                    const endereco = restante[1]

                    retorno.push({
                        bairro: bairro,
                        valores: valores,
                        detalhes: detalhes,
                        endereco: endereco
                    })

                    console.log(retorno[retorno.length - 1])
                } catch (error) {
                    console.error("ERRO NO LOOP")
                }
            }

            console.log("{ capturarImoveis }", `${retorno.length} capturados`)
            return retorno
        });
    }
}