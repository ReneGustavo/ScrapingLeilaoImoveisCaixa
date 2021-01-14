const ConsultaImoveis = new (require('./ConsultaImoveis'))();

(async () => {
    let imoveis = await ConsultaImoveis.consultar([
        [
            "MG", [
                "VARGINHA",
                "BURITIS",
                "PARACATU"
            ]
        ]
    ])
    console.log("IMOVEIS")
    console.log(imoveis)
})();