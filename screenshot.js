
const Property = new (require('./Property'))();
const process = require('process');




(async () => {
    await Property.fetch(process.argv[2], process.argv[3], process.argv[4])
})();