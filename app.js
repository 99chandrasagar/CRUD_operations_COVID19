const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(4000, () => {
      console.log("Server Running at http://localhost:4000/");
    });
  } catch (e) {
    console.log(`Error at Database ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDbObjectToResponseObj = (dbobject) => {
  return {
    stateId: dbobject.state_id,
    stateName: dbobject.state_name,
    population: dbobject.population,
  };
};

//Returns a list of all states in the state table
app.get("/states/", async (request, response) => {
  const allStatesQuery = `
    select * from state;`;
  const query = await db.all(allStatesQuery);
  response.send(
    query.map((eachstate) => convertDbObjectToResponseObj(eachstate))
  );
});

//Returns a state based on the state ID
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const allStatesQuery = `
    select * from state
    where 
    state_id = ${stateId};`;
  const query = await db.get(allStatesQuery);
  response.send(convertDbObjectToResponseObj(query));
});

//Create a district in the district table, district_id is auto-incremented
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const districtQUery = `
    insert into district (district_name, state_id, cases, cured, active, deaths)
    values
    (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths});`;
  await db.get(districtQUery);
  response.send("District Successfully Added");
});

//converting snake_case to camel_case
const convertDbobj = (dbobject1) => {
  return {
    districtId: dbobject1.district_id,
    districtName: dbobject1.district_name,
    stateId: dbobject1.state_id,
    cases: dbobject1.cases,
    cured: dbobject1.cured,
    active: dbobject1.active,
    deaths: dbobject1.deaths,
  };
};

//Returns a district based on the district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const singleDistrictQuery = `
    select *
    from district
    where district_id = ${districtId};`;
  const districtProfile = await db.get(singleDistrictQuery);
  //console.log(districtProfile);
  response.send(convertDbobj(districtProfile));
});

//Deletes a district from the district table based on the district ID
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQUery = `
    delete from district
    where district_id = ${districtId};`;
  await db.run(deleteQUery);
  response.send("District Removed");
});

//Updates the details of a specific district based on the district ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateQuery = `
  update district
  set 
    district_name  = '${districtName}',
    state_id  = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
  where district_id = ${districtId};`;
  await db.run(updateQuery);
  response.send("District Details Updated");
});

//Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const staticsQuery = `
    select
     sum(cases), sum(cured), sum(active), sum(deaths) 
     from 
     district
     where state_id = ${stateId};`;

  const statistics = await db.get(staticsQuery);
  console.log(statistics);
  response.send({
    totalCases: statistics["sum(cases)"],
    totalCured: statistics["sum(cured)"],
    totalActive: statistics["sum(active)"],
    totalDeaths: statistics["sum(deaths)"],
  });
});

const convert = (dbobject) => {
  return {
    stateName: dbobject.state_name,
  };
};
//Returns an object containing the state name of a district based on the district ID
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = `
    select state_name from state natural join district
    where district_id = ${districtId};`;
  const details = await db.get(stateQuery);
  response.send(convert(details));
});

module.exports = app;
