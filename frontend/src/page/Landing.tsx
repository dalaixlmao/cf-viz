import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import Card from "../components/Card";

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="w-full h-full flex flex-col items-center md:bg-cfbg md:bg-no-repeat md:bg-cover md:bg-white bg-blue-300 md:bg-center">
      <Navbar page={"landing"} />
      <div className="flex flex-row items-center justify-center w-4/5 mt-5">
      <input
  className="w-full md:w-1/3 bg-white z-2 py-2 px-3 rounded-lg shadow-2xl"
  type="text"
  placeholder="Search handle"
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;
      navigate("/landing/?handle=" + (target.value ? target.value : ""));
    }
  }}
/>

      </div>

      <div className="flex justify-center items-center w-full md:w-4/5 mt-5 bg-white rounded-xl font-light">
        <Card width="full h-auto md:rounded-xl">
          <h1 className="text-3xl font-bold text-center">About App</h1>
          <div className="mt-3 font-reguler border-b-2 pb-5 font-light">
            The API visualizer for Codeforces allows users to track their
            progress through detailed charts and graphs. By entering a handle
            into the search bar, you can easily access visual representations of
            a user's performance over time. This tool provides insights into the
            user's activity, problem-solving trends, and competitive progress,
            making it easier to analyze and understand their journey on
            Codeforces. Whether you're a regular participant or just curious
            about someone's progress, this visualizer offers a comprehensive
            overview of their achievements and improvements. It's a valuable
            resource for anyone looking to monitor and analyze performance data
            on Codeforces.
          </div>
          <div className="mt-2">
          Tech stack used to build this app is as follows:
            <ol >
              <li className="font-medium">
                For Frontend:
                <ol className="list-decimal ml-10 font-light">
                  <li>ReactJS as library.</li>
                  <li>TypeScript to add type definitions.</li>
                  <li>Tailwind CSS for styling the components.</li>
                  <li>Axios to fetch data and interact with backend.</li>
                  <li>
                    React Router DOM to add routes between different components
                    and pages.
                  </li>
                </ol>
              </li>
              <li className="font-medium">
                For Backend:
                <ol className="list-decimal ml-10 font-light">
                  <li>TypeScript to add type definitions.</li>
                  <li>Node as javascript run-time.</li>
                  <li>Express to add routing and middlewares in backend.</li>
                  <li>Zod to add input validation checks in middlewares.</li>
                  <li>PostgreSQL as database to store the user's data.</li>
                  <li>
                    Prisma as ORM which acts as a "bridge" between
                    object-oriented programs and relational databases.
                  </li>
                </ol>
              </li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
