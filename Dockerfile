FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY src/Dainynas.Api/Dainynas.Api.csproj src/Dainynas.Api/
RUN dotnet restore src/Dainynas.Api/Dainynas.Api.csproj

COPY . .

RUN dotnet publish src/Dainynas.Api/Dainynas.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "Dainynas.Api.dll"]