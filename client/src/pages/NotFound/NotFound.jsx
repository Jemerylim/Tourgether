import React from "react";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import PageLayout from "../../components/PageLayout/PageLayout";
import { EmptyState } from "../../components/PageState/PageState";

// Catch-all for URLs that don't match a route, so a typo still gets the navbar and a way home.
const NotFound = () => {
  const signedIn = Boolean(localStorage.getItem("authToken"));

  return (
    <PageLayout title="Page not found" subtitle="That link doesn't lead anywhere.">
      <EmptyState
        icon={Compass}
        title="Looks like a wrong turn"
        text="The page may have moved, or the link has a typo."
        action={
          <Link to={signedIn ? "/dashboard" : "/"} className="btn-primary">
            {signedIn ? "Go to your trips" : "Go to the home page"}
          </Link>
        }
      />
    </PageLayout>
  );
};

export default NotFound;
