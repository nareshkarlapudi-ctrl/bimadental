from agents.orchestrator import OrchestratorAgent


def main():
    orchestrator = OrchestratorAgent()

    # Example: route a patient search request
    result = orchestrator.route("patient", {"action": "search", "query": "Jane Doe"})
    print(result)


if __name__ == "__main__":
    main()
