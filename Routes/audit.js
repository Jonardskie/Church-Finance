const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/auditController");

const auth =
    require("../middleWare/authMiddleware");


/*
|--------------------------------------------------------------------------
| AUDIT TRAIL
|--------------------------------------------------------------------------
|
| Authentication is required.
|
| The controller additionally checks the user's role when
| req.user contains a role.const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/auditController");

const auth =
    require("../middleWare/authMiddleware");


router.get(
    "/",
    auth,
    controller.getAuditLogs
);


module.exports = router;
|
*/

router.get(
    "/",
    auth,
    controller.getAuditLogs
);


module.exports = router;