import React from "react";
import "./Publish.css";
import { Image } from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
export function Publish(props: { docsUrl?: string }) {
  const { docsUrl } = {
    docsUrl: "https://aka.ms/teamsfx-docs",
    ...props,
  };

    microsoftTeams.media.selectMedia({
      mediaType: microsoftTeams.media.MediaType.Audio,
      maxMediaCount: 1
    }, (error, attachments) => {
    if (error) {
      console.error("Error requesting media:", error);
    } else {
      console.log("Media captured:", attachments);
    }});

  return (
    <div className="publish page">
      <h2>Publish to Teams</h2>
      <p>
        Your app's resources and infrastructure are deployed and ready? Publish and register your
        app to app catalog to share your app with others in your organization!
      </p>
      <Image src="publish.png" />
      <p>
        For more information, see the{" "}
        <a href={docsUrl} target="_blank" rel="noreferrer">
          docs
        </a>
        .
      </p>
    </div>
  );
}
