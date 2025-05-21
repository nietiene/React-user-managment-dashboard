const express = require("express");
const mysql = require("mysql2");
require("dotenv").config();
const router = express.Router();

const connection = mysql.createConnection({
    host: process.env.HOST_NAME,
    user: process.env.USER_NAME,
    password: process.env.PASSWORD,
    database: process.env.DATABASE_NAME,
});
connection.connect((err) => {
    if (err) {
        throw err;
    } else {
        console.log("Connected Successfully");
    }
});

 function isAuthorized (req, res, next) {
    if (!req.session.user) {
        res.json({message: "UnAuthorized"});
    } else {
        next();
    }
 }

 // IsAdmin logged in 
 function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).json("Access denied (admin only)");
 }

 function isUser(req, res, next) {
    if (req.session.user && req.session.user.role === 'user') {
        return next();
    } else {
        res.render('user');
    }
 }

// handle login login
router.post('/login', (req, res) => {
    const { name, password } = req.body;
    const sqlLogin = "SELECT * FROM user WHERE name = ? AND password = ?";
    connection.query(sqlLogin, [ name, password ], (err, result) => {
        if (err) return res.status(500).json({error:"Login error"});
        if (result.length === 1) {
            const user = result[0];
            req.session.user = {
                id: user.id,
                name: user.name,
                role: user.role,
            };
          return res.json({
            message: "Login Successfully",
            role: user.role,
            user: req.session.user
          });
        } else {
            res.json({error:"Invalid credentials"});
        }
    });

});

// // logout 
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) res.status(500).json("Failed to log out");
        res.clearCookie('connect.id', {
            path: '/',
            httpOnly: true,
            sameSite: 'lax'
        });
        res.json("Logged Out");
    });
});

router.get('/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user});
    } else {
        res.json({ loggedIn: false});
    }
})
// // Get All users
router.get('/api/users', isAdmin, isAuthorized, (req, res) => {
    const sqlSelect = "SELECT * FROM user";
    connection.query(sqlSelect, (err, result) => {
        
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
          res.json(result);
        }
    });
});

// // get page from user

// router.get('/user/:id', isUser, (req, res) => {
//    const id = parseInt(req.params.id);
//    const sql = "SELECT * FROM user WHERE id = ?";
//    connection.query(sql, [id], (err, data) => {
//     if (err) {
//        return res.status(500).send("ERROR:" + err.message);
//     }
  
//      res.render("userPage", {
//         user: data,
//         sessionUser: req.session.user
//      })
//    });
// });

// // get form to update
// router.get('/update/:id', (req, res) => {
//     const id = parseInt(req.params.id);
//     const sql = "SELECT * FROM user WHERE id = ?";
//     connection.query(sql, [id], (err, data)  => {
//         if (err) {
//             res.status(403).send("Database error");
//         } else {
//             res.render('update', {user: data[0]});
//         }
//     });
// });

// // perform update logic
// router.post('/update/:id', (req, res) => {
//     const id = parseInt(req.params.id);
//     const { name, password } = req.body;
//     const sql = "UPDATE user SET name = ?, password = ? WHERE id = ?";
//     connection.query(sql, [name, password, id], (err) => {
//         if (err) {
//                res.status(500).send("Not Updated try again", err);
//         }
//        const fetchDataAgain = "SELECT * FROM user WHERE id = ?";
//        connection.query(fetchDataAgain, [id], (err, data) => {
//         if (err) {
//             return res.status(500).send("Error in fetching data: ", err.message);
//         } 
//         res.render("userPage", {
//             user: data,
//             sessionUser: req.session.user
//         })
//        })
//     })
// })

// // make user delete only his account
// router.get('/dlt/:id', (req, res) => {
//     const id = parseInt(req.params.id);
//     const sql = "DELETE FROM user WHERE id = ?";

//     connection.query(sql, [id], (err) => {
//         if (err) {
//             res.status(500).send("User not deleted");
//         }
//         res.render("register");
//     })
// });

// // register
// router.get('/register', (req, res) => {
//     res.render("register");
// });

// // handle register login
// router.post('/register', (req, res) => {
//     const { name, password } = req.body;
//     const sql = "INSERT INTO user(name, password) VALUES(?,?)";

//     connection.query(sql, [name, password], (err) => {
//         if (err) {
//             res.status(500).send("Not registered try again !!", err);
//         } 

//      res.redirect('/login');
//     })
// });
// // Add Data
// router.get('/add', isAdmin, isAuthorized, (req, res) => {
//     res.render("addForm");
// });

// Add New User
router.post('/add', isAdmin, isAuthorized, (req, res) => {
    const {name, password} = req.body;
    const sqlInsert = `INSERT INTO user(name, password) VALUES(?, ?)`;
    connection.query(sqlInsert, [name, password], (err) => {
       
        if (!err) {
           res.json("User Inserted")
        } else {
            res.status(500).json("data not inserted");
        }
    });
});

// // Update user 
router.get('/update/:id', isAdmin, isAuthorized, (req, res) => {
      const id = parseInt(req.params.id);
      const select= `SELECT * FROM user WHERE id = ?`;
      connection.query(select, id, (err, result) => {
      if (err || result.length === 0) return res.status(404).send("user not found");
      res.json({user: result[0]})
      });
    
});

// pushing codes
router.post('/update/:id', isAdmin, isAuthorized, (req, res) => {

    const id = parseInt(req.params.id);
    const {name, password} = req.body;
   
    const UpdateSql = `UPDATE user SET name = ? , password = ? WHERE id = ${id}`;
    connection.query(UpdateSql, [name, password], (err) => {
        if (err) {
            res.status(500).json("Data not updated", err);
        } else {
            res.json({ message: "Data Updated Successfully"});
        }
    });
});

router.get('/delete/:id',  isAdmin, isAuthorized, (req, res) => {
    const id = parseInt(req.params.id);
    const deleteSql = `DELETE FROM user WHERE id = ?`;
    connection.query(deleteSql, id, (err) => {
       
        if (err) {
            res.status(500).json({message: "User Not Deleted"});
        } else {
            res.json({message:'User deleted'});
        }
    });
});

module.exports = router;
