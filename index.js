const express = require("express");
require("dotenv").config();
const app = new express();
const cors = require("cors");
const compression = require('compression');
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 600 });
app.use(compression())
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extends: true }))





const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://ishanrana950:Xi9Qot1VD3BjGk31@cluster0.5xmvgk6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        // strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("e-commerce");
        const userCollection = database.collection("user");
        const productCollection = database.collection("product");
        const orderCollection = database.collection("order")


        // await userCollection.createIndex({ email: 1 }, { unique: true });
        await productCollection.createIndex({ category: 1 });
        await orderCollection.createIndex({ orderDate: -1 });
        await orderCollection.createIndex({ userId: 1 });
        await userCollection.createIndex({ lastLogin: -1 });
        await productCollection.createIndex({ stock: 1 });

        app.get("/api/v1/dashboard/analytics", async (req, res) => {
            try {
                const catcheAnalytics = myCache.get("dashboardDataCatche");
                if (catcheAnalytics) {
                    return res.json(catcheAnalytics)
                } else {

                }
                const [activeUser, totalRevinew, monthlyRevinew, totalProduct, inventoryMertics] = await Promise.all([
                    userCollection.countDocuments(),
                    orderCollection.aggregate(
                        [
                            {
                                $group: {
                                    _id: null,
                                    totalRevinu: {
                                        $sum: "$totalAmount"
                                    },
                                    totalOrder: {
                                        $sum: 1
                                    }
                                }
                            }
                        ]
                    ).toArray(),
                    orderCollection.aggregate([
                        {
                            $group: {
                                _id: {
                                    year: {
                                        $year: "$orderDate"
                                    },
                                    month: {
                                        $month: "$orderDate"
                                    }
                                },
                                totalAmount: {
                                    $sum: "$totalAmount"
                                },
                                monthlyOrder: {
                                    $sum: 1
                                }
                            }
                        },
                        {
                            $project:
                            /**
                             * specifications: The fields to
                             *   include or exclude.
                             */
                            {
                                _id: 0,
                                year: "$_id.year",
                                month: "$_id.month",
                                totalAmount: 1,
                                monthlyOrder: 1
                            }
                        },
                        {
                            $sort:
                            /**
                             * Provide any number of field/order pairs.
                             */
                            {
                                monthlyOrder: 1,
                                year: 1,
                                month: 1
                            }
                        }
                    ]).toArray(),
                    productCollection.countDocuments(),
                    // inventory analytics

                    productCollection.aggregate(
                        [
                            {
                                $group: {
                                    _id: null,
                                    totalProductStock: {
                                        $sum: "$stock"
                                    },
                                    avgProductStock: {
                                        $avg: "$stock"
                                    },
                                    lowStock: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $lt: ["$stock", 10]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    outOfStock: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $eq: ["$stock", 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    ).toArray(),

                    // order segment 

                    [
                        {
                            $group:
                            /**
                             * _id: The id of the group.
                             * fieldN: The first field name.
                             */
                            {
                                _id: "$userId",
                                totalSpent: {
                                    $sum: "$totalAmount"
                                },
                                avgSpent: {
                                    $avg: "$totalAmount"
                                },
                                orderCount: {
                                    $sum: 1
                                },
                                lastPurchaseDate: {
                                    $max: "$orderDate"
                                }
                            }
                        },
                        {
                            $addFields: {
                                daySinceLastPurchase: {
                                    $divide: [
                                        {
                                            $subtract: [
                                                new Date(),
                                                "$lastPurchaseDate"
                                            ]
                                        },
                                        1000 * 60 * 60 * 24
                                    ]
                                }
                            }
                        },
                        {
                            $addFields:
                            
                            {
                                segment: {
                                    $switch: {
                                        branches: [
                                            {
                                                case: {
                                                    $and: [
                                                        {
                                                            $gt: ["$totalAmount", 1000]
                                                        },
                                                        {
                                                            $lt: [
                                                                "$daySinceLastPurchase",
                                                                7
                                                            ]
                                                        }
                                                    ]
                                                },
                                                then: "vip user"
                                            },
                                            {
                                                case: {
                                                    $lt: [
                                                        "$daySinceLastPurchase",
                                                        7
                                                    ]
                                                },
                                                then: "Regular user"
                                            },
                                            {
                                                case: {
                                                    $lt: [
                                                        "$daySinceLastPurchase",
                                                        30
                                                    ]
                                                },
                                                then: "Active user"
                                            }
                                        ],
                                        default: "At risk"
                                    }
                                }
                            }
                        }
                    ].toArray()








                ]);
                const analyticsData = {
                    activeUser,
                    totalRevinew,
                    monthlyRevinew,
                    totalProduct,
                    inventoryMertics
                };
                myCache.set("dashboardDataCatche", analyticsData, 600);
                return res.json(analyticsData)
            } catch (error) {
                console.log(error)
            }
        })





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(5500, () => {
    console.log(`Server run successfully at http://localhost:5500`)
})