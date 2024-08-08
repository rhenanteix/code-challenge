import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Title } from '../infra/constants';
import { Communities } from '../communities/communities';
import { People } from '../people/people';
import { formatDate } from '../utils/formatDate';
import { timePassedInSeconds } from '../utils/timePassedInSeconds';

export const App = () => {
  const [communityId, setCommunityId] = useState('');
  const [, setReload] = useState(false);

  const { communities, isCommuitiesLoading } = useTracker(() => {
    const communitiesHandler = Meteor.subscribe('communities');

    if (!communitiesHandler.ready()) {
      return { isCommuitiesLoading: true, communities: [] };
    }

    const communitiesData = Communities.find({}).fetch();

    return { isCommuitiesLoading: false, communities: communitiesData };
  });

  const { people, isPeopleLoading } = useTracker(() => {
    if (!communityId) {
      return { isPeopleLoading: false, people: [] };
    }

    const peopleHandler = Meteor.subscribe('people');

    if (!peopleHandler.ready()) {
      return { isPeopleLoading: true, people: [] };
    }

    const peopleData = People.find({ communityId }).fetch();

    return { isPeopleLoading: false, people: peopleData };
  });

  function checkText(checkIn) {
    if (!checkIn) {
      return 'in';
    }

    return 'out';
  }

  function showButton(person) {
    if (person.checkOut) {
      return false;
    }

    if (person.checkIn && timePassedInSeconds(new Date(person.checkIn)) < 5) {
      return false;
    }

    return true;
  }

  function handleCheck(person) {
    if (!person.checkIn) {
      Meteor.call('people.checkIn', person._id);
      setTimeout(() => {
        setReload(oldState => !oldState);
      }, 5000);
      return;
    }

    Meteor.call('people.checkOut', person._id);
  }

  function peopleInTheEvent() {
    return people.filter(person => person.checkIn && !person.checkOut).length;
  }

  function peopleNotCheckedIn() {
    return people.filter(person => !person.checkIn).length;
  }

  function peopleByCompanyInTheEvent() {
    const peopleIn = people.filter(
      person => person.checkIn && !person.checkOut
    );

    let companies = [];

    peopleIn.forEach(person => {
      const { companyName } = person;

      if (!companyName) {
        return;
      }

      const companyNameAlreadyInList = companies.findIndex(name =>
        name.includes(companyName)
      );

      if (companyNameAlreadyInList !== -1) {
        const companiesCopy = [...companies];

        const [, companyNumberWithParentheses] = companiesCopy[
          companyNameAlreadyInList
        ].split(/(?<=\D)(?=\d)/);
        const companyNumber = Number(
          companyNumberWithParentheses.replace('(', '').replace(')', '')
        );

        companiesCopy[
          companyNameAlreadyInList
        ] = `${companyName} (${companyNumber + 1})`;
        companies = [...companiesCopy];
        return;
      }

      companies.push(`${companyName} (1)`);
    });

    return companies.length > 0 ? companies : ['none'];
  }

  return (
    <div className="bg-gradient-to-b from-[#e1e5f0] to-[#d0edf5] py-[20px] md:py-[15px] md:px-20 px-2 relative shadow-md">
      <h1 className="text-3xl">{Title.HOME_TITLE}</h1>

      {isCommuitiesLoading ? (
        <span>Loading...</span>
      ) : (
        <div className="mt-6 flex flex-col">
          <select
            value={communityId}
            onChange={e => setCommunityId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select an event
            </option>
            {communities.map(community => (
              <option key={community._id} value={community._id}>
                {community.name}
              </option>
            ))}
          </select>

          {!isPeopleLoading && communityId && (
            <div className="flex flex-col my-10">
              <span>
                <strong>People in the event right now:</strong>{' '}
                {peopleInTheEvent()}
              </span>
              <span>
                <strong>People by company in the event right now:</strong>{' '}
                {peopleByCompanyInTheEvent().join(', ')}
              </span>
              <span>
                <strong>People not checked-in:</strong> {peopleNotCheckedIn()}
              </span>
            </div>
          )}

          {isPeopleLoading ? (
            <span className="mt-4">Loading...</span>
          ) : (
            <ul className="flex flex-col gap-6">
              {people.map(person => (
                <li
                  key={person._id}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span>
                      Name: {person.firstName} {person.lastName}
                    </span>
                    {person.companyName && person.title && (
                      <div className="flex gap-4">
                        <span>Company: {person.companyName}</span>
                        <span>Title: {person.title}</span>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <time>
                        Check-in:{' '}
                        {person.checkIn
                          ? formatDate(new Date(person.checkIn))
                          : 'N/A'}
                      </time>
                      <time>
                        Check-out:{' '}
                        {person.checkOut
                          ? formatDate(new Date(person.checkOut))
                          : 'N/A'}
                      </time>
                    </div>
                  </div>
                  {showButton(person) === true && (
                    <button
                      onClick={() => handleCheck(person)}
                      className="bg-gray-300 p-2 rounded-md"
                    >
                      Check {checkText(person.checkIn)} {person.firstName}{' '}
                      {person.lastName}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
