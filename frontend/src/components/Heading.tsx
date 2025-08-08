export default function Heading({
  title,
  subHeading,
  text,
}: {
  title?: string;
  subHeading?: string;
  text?: string;
}) {
  return (
    <div className="flex flex-col justify-center items-center">
      {text ? (
        <div className="text-2xl font-bold">{text}</div>
      ) : (
        <>
          <div className="text-2xl font-bold">{title}</div>
          <div className="text-gray-500">
            {subHeading}&nbsp;
            {title && <a href={title=="Sign In"? "/signup":"/signin"} className="underline">{title == "Sign In" ? "Create an account" : "Log in"}</a>}
          </div>
        </>
      )}
    </div>
  );
}
