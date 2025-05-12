FROM docker.io/library/ubuntu:22.04

VOLUME ["/workspace", "/output", '/files/output', '/files/environment']                                                                                                                                

ENV NVM_DIR="/node"         

RUN apt-get update \
    && apt-get install -y jq libfuse2 zsync curl git file \
    && apt-get autoremove --purge -y \                                                                                                                       
    && apt-get autoclean \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir $NVM_DIR \
    && curl https://raw.githubusercontent.com/creationix/nvm/v0.40.1/install.sh | bash \
    && . $NVM_DIR/nvm.sh \
    && nvm install v23.3.0 \
    && nvm use v23.3.0 \
    && mkdir -p /workspace /output /files \
    && touch /files/output \
    && touch /files/environment \
    && chmod -R 777 /workspace /output /files \ 
    && git config --global --add safe.directory /workspace

WORKDIR /workspace

ENV IS_ELECTRON="false"
ENV GITHUB_REPOSITORY=""
ENV GITHUB_TOKEN=""    

COPY ./resources /action/resources                                                                  
COPY ./dist /action/dist    

RUN chmod +x /action/resources/appimagetool

CMD ["/node/versions/node/v23.3.0/bin/node", "/action/dist/action.cjs.js"]                                                            

