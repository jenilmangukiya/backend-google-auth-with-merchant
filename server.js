require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const authRoute = require("./routes/auth");
const cookieSession = require("cookie-session");
const passportStrategy = require("./passport");
const app = express();
const { google } = require("googleapis");
const merchant = google.content("v2.1"); // Google Content API version 2.1

app.use(
  cookieSession({
    name: "session",
    keys: ["cyberwolve"],
    maxAge: 24 * 60 * 60 * 100,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);

app.use("/auth", authRoute);

async function getMerchantId(accessToken) {
  console.log("hello");
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    console.log("hiii");
    // console.log("oauth2Client", oauth2Client);
    // Get the list of Merchant Center accounts

    // const response = await merchant.accounts.list({
    //   auth: oauth2Client,
    // });
    const response = await oauth2Client.request({
      url: "https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo",
      method: "GET",
    });

    console.log("response", response);
    console.log("response.data", response.data);
    if (
      response.data.accountIdentifiers &&
      response.data.accountIdentifiers.length > 0
    ) {
      // Assuming the user has at least one Merchant Center account
      const merchantId = response.data.accountIdentifiers[0].merchantId; // Get the first account's ID
      return merchantId;
    } else {
      console.log("No Merchant accounts found");
      return null;
    }
  } catch (error) {
    console.error("Error fetching Merchant ID:", error);
    return null;
  }
}

// Function to fetch products
async function getProductList(accessToken, merchantId) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Use the Merchant Center account ID and the `products.list` endpoint
    const response = await merchant.products.list({
      auth: oauth2Client,
      merchantId: merchantId, // Replace with your Merchant Center ID

      //   maxResults: 10, // Optional: specify number of products to retrieve
    });
    console.log("response", response);
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    return null;
  }
}

app.get("/get-products", async (req, res) => {
  //   console.log(
  //     "req.user && req.user.accessToken",
  //     req.session
  //     // req.user.accessToken
  //   );
  if (req.user && req.user.accessToken) {
    try {
      // Fetch the Merchant ID using the user's access token
      const merchantId = await getMerchantId(req.user.accessToken);
      console.log("merchantId", merchantId);
      if (merchantId) {
        // Fetch the product list using the Merchant ID
        const productList = await getProductList(
          req.user.accessToken,
          merchantId
        );
        res.json({
          message: "Successfully fetched products",
          products: productList,
        });
      } else {
        res.status(400).json({
          error: true,
          message: "Merchant account not found",
        });
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({
        error: true,
        message: "Failed to fetch product data",
      });
    }
  } else {
    res.status(403).json({
      error: true,
      message: "Not Authorized",
    });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listenting on port ${port}...`));
