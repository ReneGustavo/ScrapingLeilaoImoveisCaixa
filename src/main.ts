

import * as process from "process";
import {Property} from "./Property";

(async () => {
    let property = new Property(process.argv[2], process.argv[3], process.argv[4])
    await property.fetch()
})();