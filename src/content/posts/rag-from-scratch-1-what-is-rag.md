---
lang: en
title: "RAG from Scratch #1: What Is RAG and Why LLMs Need It"
description: "Part 1 of a 3-part series on Retrieval-Augmented Generation: why LLMs hallucinate on private or fresh information, and how the two-step Retrieval + Generation loop fixes it."
published: 2026-10-10
category: AI
tags: ["RAG", "LLM", "AI", "Retrieval", "AI Agents", "Tutorial"]
author: minhpt
series:
  name: "RAG from Scratch"
  order: 1
  total: 3

---

*This is part 1 of a 3-part series on Retrieval-Augmented Generation. We'll start with the problem RAG solves, then look inside the LLM (part 2), and finally at how retrieval actually works (part 3).*

## The problem: LLMs know a lot — but not your data

RAG — **Retrieval-Augmented Generation** — is an approach that improves an LLM's performance by giving it access to information it doesn't know from training.

Here's the intuition. Ask a general question like *"why are hotel prices usually higher on weekends?"* and a model can answer from general knowledge: people travel on weekends, so competition for rooms goes up. But ask *"why are hotels in Vancouver so expensive this weekend?"* and general knowledge isn't enough — you need specific, current information. Ask *"why are more hotels closing in Vancouver than in the nearby town?"* and you need even more context: local history, regulations, market conditions.

An LLM is a lot like a well-read person. It has broad knowledge from reading a huge amount of text. For many prompts that's plenty. But for questions about **new events** or **specialized, private information** it has never seen, it simply doesn't have the facts — and it won't reliably tell you that.

## Two steps to answer any question

Answering a question has two parts. First you **gather** the information you need. Then you **interpret** it and produce an answer.

For some questions you don't need to gather anything — you already know the answer. For others you need a little, or a lot, of extra information. In RAG these two steps have names:

- **Retrieval** — the process of collecting useful information.
- **Generation** — the process of interpreting that information and responding.

LLMs benefit from retrieval for basically the same reason you do: better inputs lead to better answers.

## Why the model "makes things up"

During training, an LLM sees huge amounts of text and learns the patterns in it. When you prompt it, you're hoping the information you need already appeared in that training data. Often it did. But when the model is asked about your company's internal data or today's news, that information almost certainly wasn't in training — so the model isn't in a good position to answer.

In those cases it will sometimes produce answers that *sound* right but are wrong. We call this a **hallucination**. The key insight: the model isn't malfunctioning or "lying" — it is designed to produce **likely** text, not **truthful** text. To an LLM, "truth" is just a sequence of words with high probability given its training data. With high-quality training data, that proxy lines up with reality; the challenge is making sure the model has access to as much relevant information as possible.

## The core idea of RAG

The simplest fix is almost suspiciously simple: **just put the useful information in the prompt.**

The core idea of RAG is that you can *augment* a prompt before sending it to the LLM. Alongside the user's original question, you add information that helps the LLM answer. Ask a RAG system *"why are hotels in Vancouver super expensive this weekend?"* and it first runs a **retrieval** step to gather relevant information, then builds an **augmented prompt** containing both the original question and the retrieved information.

Of course, that information has to be retrieved from somewhere. The component that does this is called the **Retriever**.

## Where RAG shows up

Once you have a retriever + a generator, the same pattern applies almost everywhere:

- **Code generation** — models have seen enormous amounts of code, but generating accurate code for *your* specific project needs project-specific context.
- **Company chatbots** — answering internal questions from internal documents.
- **Specialized knowledge** — any domain where the model was never trained on the good stuff.
- **Search engines** — retrieving the documents most relevant to a query.
- **Personalized RAG** — your own notes, files, and preferences as the knowledge base.

The rule of thumb: whenever you have access to information that might not have been in the model's training data, you have a candidate for a useful RAG application.

## The architecture, in one breath

A RAG system looks, to the user, exactly like a normal LLM: type a prompt, get an answer. Internally there are a few extra steps:

1. The prompt goes to the **Retriever**.
2. The retriever queries a **knowledge base** — a store of useful documents — and returns the most relevant material.
3. The system builds an **augmented prompt**: the original question plus the retrieved documents.
4. The **LLM** receives the augmented prompt and responds, drawing on both its training knowledge and the retrieved information.

The user experience doesn't change — there's just a small delay. In exchange, the answer is far more likely to be accurate, current, and relevant to the context.

## Why it's worth it

Adding retrieved context looks like a small change, but it buys a lot:

- It gives the model information it otherwise **could not have** — company policy, a personal fact, this morning's news.
- It **reduces hallucination**, because relevant information in the prompt steers the response and discourages generic or misleading output.
- It makes **updating knowledge easy** — no retraining required; you just update the knowledge base and re-index.
- It improves **citations** — a RAG system can attach sources to the augmented prompt, and the model can surface them in its answer.
- It lets each component **do what it's best at**: the retriever filters a huge amount of information down to the most relevant pieces, and the LLM focuses on writing a good response.

That's the pitch. But to understand *why* this works — and where it breaks — you need to understand what an LLM actually does. That's part 2.
