"""
CrewAI crews for BorjaxAI.
Provides pre-built crews and a dynamic custom agent runner.
"""
import os
from typing import Optional

try:
    from crewai import Agent as CrewAgent, Task as CrewTask, Crew, Process
    from crewai_tools import SerperDevTool, WebsiteSearchTool
    CREWAI_AVAILABLE = True
except ImportError:
    CREWAI_AVAILABLE = False

import boto3
import json

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-5-sonnet-20241022-v2:0")


def get_bedrock_llm():
    """Return a CrewAI-compatible Bedrock LLM config."""
    if not CREWAI_AVAILABLE:
        return None
    try:
        from langchain_aws import ChatBedrock
        llm = ChatBedrock(
            model_id=BEDROCK_MODEL,
            region_name=AWS_REGION,
            model_kwargs={"max_tokens": 4096, "temperature": 0.7},
        )
        return llm
    except Exception:
        return None


def run_research_crew(prompt: str) -> str:
    """Research crew: Researcher + Analyst."""
    if not CREWAI_AVAILABLE:
        return _bedrock_fallback(f"Research: {prompt}")

    llm = get_bedrock_llm()

    researcher = CrewAgent(
        role="Senior Research Analyst",
        goal="Conduct comprehensive research and gather accurate, up-to-date information",
        backstory=(
            "You are a meticulous research analyst with expertise in synthesizing information "
            "from multiple sources. You fact-check everything and present balanced findings."
        ),
        verbose=False,
        allow_delegation=False,
        llm=llm,
    )

    analyst = CrewAgent(
        role="Strategic Insights Analyst",
        goal="Analyze research findings and produce actionable, structured reports",
        backstory=(
            "You transform raw research into clear, structured reports with key insights, "
            "trends, and recommendations. Your reports are executive-ready."
        ),
        verbose=False,
        allow_delegation=False,
        llm=llm,
    )

    research_task = CrewTask(
        description=f"Research the following topic thoroughly: {prompt}. "
                   "Gather key facts, statistics, trends, and expert perspectives.",
        expected_output="A comprehensive research summary with key findings, facts, and data points.",
        agent=researcher,
    )

    analysis_task = CrewTask(
        description="Analyze the research findings and write a structured report with: "
                   "1. Executive Summary, 2. Key Findings, 3. Trends & Implications, "
                   "4. Recommendations. Format with clear headers.",
        expected_output="A well-structured analytical report in markdown format.",
        agent=analyst,
        context=[research_task],
    )

    crew = Crew(
        agents=[researcher, analyst],
        tasks=[research_task, analysis_task],
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()
    return str(result)


def run_write_crew(prompt: str) -> str:
    """Content writing crew: Researcher + Writer + Editor."""
    if not CREWAI_AVAILABLE:
        return _bedrock_fallback(f"Write: {prompt}")

    llm = get_bedrock_llm()

    writer = CrewAgent(
        role="Expert Content Writer",
        goal="Write engaging, well-structured, and informative content",
        backstory=(
            "You are a skilled content writer who creates compelling narratives. "
            "You excel at clarity, flow, and making complex topics accessible."
        ),
        verbose=False,
        allow_delegation=False,
        llm=llm,
    )

    editor = CrewAgent(
        role="Senior Editor",
        goal="Polish content to be clear, engaging, and error-free",
        backstory=(
            "You are a detail-oriented editor who improves clarity, structure, "
            "and impact of written content while preserving the author's voice."
        ),
        verbose=False,
        allow_delegation=False,
        llm=llm,
    )

    write_task = CrewTask(
        description=f"Write high-quality content about: {prompt}. "
                   "Be thorough, engaging, and well-structured.",
        expected_output="A complete, well-written draft in markdown format.",
        agent=writer,
    )

    edit_task = CrewTask(
        description="Edit and polish the draft. Improve clarity, fix any issues, "
                   "ensure consistent tone, and finalize the piece.",
        expected_output="A publication-ready piece in markdown format.",
        agent=editor,
        context=[write_task],
    )

    crew = Crew(
        agents=[writer, editor],
        tasks=[write_task, edit_task],
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()
    return str(result)


def run_analyze_crew(prompt: str) -> str:
    """Analysis crew: Analyst + Reporter."""
    if not CREWAI_AVAILABLE:
        return _bedrock_fallback(f"Analyze: {prompt}")

    llm = get_bedrock_llm()

    analyst = CrewAgent(
        role="Data Analyst",
        goal="Perform deep analysis and extract meaningful insights",
        backstory=(
            "You are a systematic analyst who breaks down complex information, "
            "identifies patterns, and draws evidence-based conclusions."
        ),
        verbose=False,
        allow_delegation=False,
        llm=llm,
    )

    analyze_task = CrewTask(
        description=f"Perform a thorough analysis of: {prompt}. "
                   "Identify key patterns, insights, and conclusions.",
        expected_output="A structured analysis with findings, patterns, and insights in markdown.",
        agent=analyst,
    )

    crew = Crew(
        agents=[analyst],
        tasks=[analyze_task],
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()
    return str(result)


def run_custom_agent(
    agent_config: dict,
    prompt: str,
) -> str:
    """Run a user-defined custom agent."""
    if not CREWAI_AVAILABLE:
        return _bedrock_fallback(
            f"Custom agent '{agent_config.get('name', 'Agent')}': {prompt}"
        )

    llm = get_bedrock_llm()

    custom_agent = CrewAgent(
        role=agent_config.get("role", "AI Assistant"),
        goal=agent_config.get("goal", "Help the user effectively"),
        backstory=agent_config.get("backstory", "You are a helpful AI assistant."),
        verbose=agent_config.get("verbose", False),
        allow_delegation=False,
        llm=llm,
    )

    task = CrewTask(
        description=prompt,
        expected_output="A comprehensive, helpful response addressing the user's request.",
        agent=custom_agent,
    )

    crew = Crew(
        agents=[custom_agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False,
    )

    result = crew.kickoff()
    return str(result)


def _bedrock_fallback(prompt: str) -> str:
    """Fallback to direct Bedrock call when CrewAI is not available."""
    try:
        bedrock = boto3.client(
            "bedrock-runtime",
            region_name=AWS_REGION,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )

        response = bedrock.invoke_model(
            modelId=BEDROCK_MODEL,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4096,
                "messages": [{"role": "user", "content": prompt}],
            }),
        )

        body = json.loads(response["body"].read())
        return body["content"][0]["text"]
    except Exception as e:
        return f"Error executing task: {str(e)}"
