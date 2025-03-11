import React, { useState } from "react";
import { useRouter } from "next/router";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { IssueTable } from "../../components/issues/IssueTable";

const ExternalIssuesPage = () => {
    const [url, setUrl] = useState("");
    const [data, setData] = useState(null);
    const router = useRouter();

    const handleSubmit = async () => {
        const { owner, repo, number } = parseGithubUrl(url);
        try {
            const response = await fetch(`/api/github/getDetails?owner=${owner}&repo=${repo}&number=${number}`);
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Error fetching repository data:", error);
        }
    };

    const parseGithubUrl = (url) => {
        const match = url.match(/github.com[/:]([^/]+)[/:]([^/]+)(?:/issues/|/pull/)(\d+)/);
        if (!match) throw new Error("Invalid GitHub URL");
        
        return { owner: match[1], repo: match[2], number: match[3] };
    }; 

    return (
        <div className="p-4">
            <h1 className="text-xl mb-4">External GitHub Issues</h1>
            <Input 
                type="text" 
                placeholder="Enter GitHub Issue/Pull URL" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mb-2"
            />
            <Button onClick={handleSubmit}>Fetch Issue/Pull Request</Button>
            {data && (
                <div className="mt-4">
                    <IssueTable repoFullName={`${data.owner}/${data.repo}`} />
                </div>
            )}
        </div>
    );
};

export default ExternalIssuesPage;