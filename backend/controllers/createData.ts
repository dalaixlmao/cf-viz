function createData(response: any) {
    const result = response.result;
    console.log("working in controller b4 operation");
    let m: { [key: string]: { tags: string[]; rating: number } } = {}; // Initialize as an object with specified structure
  
    for (let i = 0; i < result.length; i++) {
      if (result[i].verdict === "OK") {
        const problemName =
          result[i].problem.name +
          result[i].problem.index +
          result[i].problem.contestId;
        m[problemName] = {
          tags: result[i].problem.tags,
          rating: result[i].problem.rating,
        };
      }
    }
    console.log(Object.keys(m).length);
    return m;
  }
  
  export default createData;