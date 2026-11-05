# Sample Data for Resume Intelligence Hub

This directory contains sample candidate resume PDFs (`resume-001.pdf` through `resume-010.pdf`) for testing and demo purposes.

## Quick Start Guide

1. Launch the application:
   ```bash
   streamlit run main/main.py
   ```
2. In the Streamlit sidebar, select **Add Resume**.
3. Upload any of the sample PDF files from this `sample_data/` folder.
4. Confirm upload to compute vector embeddings, extract skills via the local LLM, and store the candidate record in ChromaDB.
